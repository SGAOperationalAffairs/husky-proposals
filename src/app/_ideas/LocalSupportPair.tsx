"use client";

import { useState } from "react";
import { SupportPair } from "@/components/SupportPair";

// Support and I'll participate on an idea's page, held in the page until E6
// saves taps, so the pair and its confirmation (#67) work on a real idea.
// Nothing is stored and the counts do not change; a reload clears the taps.
// Replaced by the support and participate actions.
export function LocalSupportPair({ ideaNumber }: { ideaNumber: number }) {
  const [supported, setSupported] = useState(false);
  const [participating, setParticipating] = useState(false);
  return (
    <SupportPair
      look="buttons"
      ideaNumber={ideaNumber}
      supported={supported}
      participating={participating}
      onSupportChange={setSupported}
      onParticipateChange={setParticipating}
    />
  );
}
