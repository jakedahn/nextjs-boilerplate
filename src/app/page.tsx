"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

export default function Home() {
  return (
    <div className="home">
      <Calendar mode="single" className="rounded-md border shadow" />
    </div>
  );
}
