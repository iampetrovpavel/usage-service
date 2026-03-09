import { useEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { adminTokenAtom } from "../lib/atoms";
import { trpc } from "../lib/trpc";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

export default function LoginPage() {
  const [error, setError] = useState("");
  const setToken = useSetAtom(adminTokenAtom);
  const buttonRef = useRef<HTMLDivElement>(null);

  const loginMutation = trpc.admin.login.useMutation({
    onSuccess(data) {
      setToken(data.token);
    },
    onError(err) {
      setError(err.message ?? "Not authorized for admin access");
    },
  });

  const loginMutationRef = useRef(loginMutation);
  loginMutationRef.current = loginMutation;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: google.accounts.id.CredentialResponse) => {
          setError("");
          loginMutationRef.current.mutate({ idToken: response.credential });
        },
      });
      if (buttonRef.current) {
        google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "signin_with",
        });
      }
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-8">
          Usage Service Admin
        </h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center gap-4">
          <div ref={buttonRef} />
          {loginMutation.isPending && (
            <p className="text-sm text-gray-500">Verifying...</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
