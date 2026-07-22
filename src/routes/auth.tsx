import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, collection, query, limit, getDocs, addDoc, getDoc, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const user = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
    if (user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign in · Attendly" },
      { name: "description", content: "Sign in or create your admin account." },
      { property: "og:title", content: "Sign in · Attendly" },
      { property: "og:description", content: "Sign in to Attendly to manage classes and take attendance." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const user = cred.user;
      
      // Ensure profile exists
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      if (!profileSnap.exists()) {
        await setDoc(doc(db, "profiles", user.uid), {
          id: user.uid,
          full_name: email.split("@")[0],
        });
      }

      // Check if any admins exist, if not make this user the admin
      const q = query(collection(db, "user_roles"), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, "user_roles"), {
          user_id: user.uid,
          role: "admin"
        });
      } else {
        const myRoleSnap = await getDocs(query(collection(db, "user_roles"), where("user_id", "==", user.uid)));
        if (myRoleSnap.empty) {
          await addDoc(collection(db, "user_roles"), {
            user_id: user.uid,
            role: "teacher"
          });
        }
      }

      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      await setDoc(doc(db, "profiles", user.uid), {
        id: user.uid,
        full_name: fullName,
      });

      // Check if any admins exist, if not make this user the admin
      const q = query(collection(db, "user_roles"), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) {
        await addDoc(collection(db, "user_roles"), {
          user_id: user.uid,
          role: "admin"
        });
      } else {
        await addDoc(collection(db, "user_roles"), {
          user_id: user.uid,
          role: "teacher"
        });
      }

      toast.success("Account created. You can sign in now.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      // Optionally check if profile exists, if not create one
      await setDoc(doc(db, "profiles", user.uid), {
        id: user.uid,
        full_name: user.displayName,
      }, { merge: true });

      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error("Google sign-in failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Attendly Logo" className="h-9 w-9 object-contain" />
            <span className="font-display text-xl font-semibold">Attendly</span>
          </div>
          <div>
            <h2 className="font-display text-4xl leading-tight">
              "Turned our 20-minute roll call into 30 seconds."
            </h2>
            <p className="mt-4 opacity-80">— The point of Attendly.</p>
          </div>
          <div className="text-xs opacity-70">
            The first person to sign up becomes the school admin. After that, admins create teacher accounts.
          </div>
        </div>

        <div className="flex items-center justify-center p-6">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Welcome</CardTitle>
              <CardDescription>Sign in or create your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="signin">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="password">Password</Label>
                      <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign in
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="fullName">Full name</Label>
                      <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="su-email">Email</Label>
                      <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="su-password">Password</Label>
                      <Input id="su-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                Continue with Google
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
