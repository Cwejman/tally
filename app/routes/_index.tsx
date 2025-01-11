import type {MetaFunction} from "@remix-run/node";
import {Link} from "@remix-run/react";
import React from "react";

export const meta: MetaFunction = () => [{ title: 'Ledger '}];

//

export default function Index() {
  return (
    <div className="flex min-h-full justify-center items-center">
      <Link to="/register">Register</Link>
    </div>);
}
