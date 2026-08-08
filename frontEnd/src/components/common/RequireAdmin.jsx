import { Navigate, Outlet } from "react-router-dom";

// /admin/* pages previously had no client-side guard at all - anyone could load the page
// itself while logged out (the data fetches inside would just fail). This redirects to
// /login before the page ever renders if there's no admin session in localStorage.
export default function RequireAdmin() {
  const token = localStorage.getItem("token");
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!token || !user?.isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
