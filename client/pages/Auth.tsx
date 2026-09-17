import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Check, Hospital, RefreshCw } from "lucide-react";
import { demoAccounts, signIn, signUp, SessionUser, UserRole } from "@/lib/auth";
import { Brand } from "@/components/dashboard/navigation";
function LogoPanel() {
  return (
    <div className="auth-visual">
      <Brand />

      <div className="auth-visual-content">
        <div className="health-orbit">
          <Hospital size={34} />
          <span className="orbit-dot orbit-one" />
          <span className="orbit-dot orbit-two" />
          <span className="orbit-dot orbit-three" />
        </div>

        <p className="eyebrow text-mint">Connected healthcare operations</p>

        <h1>
          Smarter segregation.
          <br />
          <span>Safer healthcare.</span>
        </h1>

        <p>
          Bring every waste decision, pickup and compliance signal into one
          calm operational workspace.
        </p>

        <div className="auth-feature">
          <Check size={14} /> Trace every collection from bin to destination
        </div>

        <div className="auth-feature">
          <Check size={14} /> Turn better segregation into measurable impact
        </div>
      </div>

      <p className="text-[10px] text-slate-500">
        Secure demo workspace - SmartMedWaste
      </p>
    </div>
  );
}

function AuthPage({
  onAuthenticated,
}: {
  onAuthenticated: (user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<UserRole>("facility");
  const [email, setEmail] = useState(demoAccounts.facility.email);
  const [password, setPassword] = useState("demo123");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirm) {
      return setError("Passwords do not match.");
    }

    if (mode === "signup" && !terms) {
      return setError("Please accept the terms to create an account.");
    }

    setLoading(true);

    try {
      const user =
        mode === "login"
          ? await signIn(email, password)
          : await signUp({
              name,
              email,
              role,
              organization,
            });

      onAuthenticated(user);

      navigate(
        user.role === "collector"
          ? "/collector"
          : user.role === "admin"
            ? "/admin"
            : "/",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const demo = (nextRole: UserRole) => {
    const account = demoAccounts[nextRole];

    setRole(nextRole);
    setEmail(account.email);
    setPassword(account.password);
    setMode("login");
    setError("");
  };

  return (
    <div className="auth-page">
      <LogoPanel />

      <div className="auth-form-wrap">
        <div className="auth-mobile-brand">
          <Brand />
        </div>

        <div className="auth-form-box">
          <div className="mb-7">
            <p className="eyebrow text-teal">
              {mode === "login"
                ? "Facility workspace"
                : "Create workspace access"}
            </p>

            <h2 className="mt-2 text-[28px] font-bold tracking-[-.04em] text-navy">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>

            <p className="mt-1.5 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to manage your healthcare waste operations."
                : "Set up a secure account for your operations team."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <Field
                  label="Full name"
                  value={name}
                  onChange={setName}
                  placeholder="Riya Kapoor"
                  required
                />

                <Field
                  label="Organization / facility"
                  value={organization}
                  onChange={setOrganization}
                  placeholder="Apollo Hospitals"
                  required
                />
              </>
            )}

            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@facility.com"
              required
            />

            <div>
              <label className="form-label">Password</label>

              <div className="relative">
                <input
                  className="form-input pr-10"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {mode === "signup" && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      className={`h-1 flex-1 rounded ${
                        password.length >= level * 3
                          ? "bg-teal"
                          : "bg-slate-200"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {mode === "signup" && (
              <Field
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={setConfirm}
                placeholder="Repeat password"
                required
              />
            )}

            {mode === "signup" && (
              <div>
                <label className="form-label">Role</label>

                <select
                  className="form-input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="facility">Healthcare Facility</option>
                  <option value="collector">Waste Collector</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            )}

            {mode === "login" ? (
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-slate-500">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="accent-teal"
                  />
                  Remember me
                </label>

                <button type="button" className="font-bold text-teal">
                  Forgot password?
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={terms}
                  onChange={(e) => setTerms(e.target.checked)}
                  className="accent-teal"
                />
                I agree to the workspace terms.
              </label>
            )}

            {error && (
              <div className="form-error">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button
              disabled={loading}
              className="primary-button w-full py-3"
            >
              {loading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : mode === "login" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </button>
          </form>

          {mode === "login" && (
            <>
              <div className="divider">
                <span>OR</span>
              </div>

              <div>
                <p className="mb-2 text-center text-[11px] font-semibold text-slate-500">
                  Try a demo workspace
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {(["facility", "collector", "admin"] as UserRole[]).map(
                    (item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => demo(item)}
                        className="demo-button"
                      >
                        <span className={`demo-dot demo-${item}`} />
                        {item === "facility"
                          ? "Facility"
                          : item === "collector"
                            ? "Collector"
                            : "Admin"}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </>
          )}

          <p className="mt-7 text-center text-xs text-slate-500">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
              }}
              className="font-bold text-teal"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="form-label">{label}</label>

      <input
        className="form-input"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
export { AuthPage };
export default AuthPage;
