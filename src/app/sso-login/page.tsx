import BingoMain from "@/components/BingoMain";
import { Spinner } from "@/components/Spinner";
import React, { Suspense } from "react";

const SSOLogin = () => {
  return (
    <>
      <Suspense fallback={<Spinner />}>
        <BingoMain />
      </Suspense>
    </>
  );
};

export default SSOLogin;
