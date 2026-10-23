import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { Layout, ProtectedRoute } from "./components/Layout";
import {
  Login,
  Register,
  ForgotPassword,
  ResetPassword,
  VerifyEmail,
} from "./pages/Authentication";
import Profile from "./pages/Profile";
import ApiKeys from "./pages/ApiKeys";
import Users from "./pages/Users";
import Requests from "./pages/Requests";
import CreateRequest from "./pages/CreateRequest";
import RequestDetail from "./pages/RequestDetail";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/profile" replace />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="verify" element={<VerifyEmail />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route path="requests" element={<Requests />} />
              <Route path="requests/new" element={<CreateRequest />} />
              <Route path="requests/:requestId" element={<RequestDetail />} />
              <Route path="profile" element={<Profile />} />
              <Route path="api-keys" element={<ApiKeys />} />
              <Route element={<ProtectedRoute admin />}>
                <Route
                  path="admin/conflicted-requests"
                  element={<Requests conflictedOnly />}
                />
                <Route path="admin/users" element={<Users />} />
                <Route
                  path="admin/users/:userId/keys"
                  element={<ApiKeys admin />}
                />
              </Route>
            </Route>
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <h1>Page not found</h1>
                  <p>That page isn’t available.</p>
                  <Link to="/" className="btn btn-primary">
                    Go to CampusPoint
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
