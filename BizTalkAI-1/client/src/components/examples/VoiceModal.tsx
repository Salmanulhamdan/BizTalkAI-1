import VoiceModal from "../VoiceModal";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function VoiceModalExample() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setIsOpen(true)}>Open Voice Modal</Button>
      <VoiceModal
        company="Al Ameen Bakery"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
}
