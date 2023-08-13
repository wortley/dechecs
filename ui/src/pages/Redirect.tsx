import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function Redirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/play", {
      state: location.state,
    });
  }, []);

  return <></>;
}
