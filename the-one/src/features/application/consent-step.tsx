"use client";

import { consentItems } from "@/config/application-schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  consents: Record<string, boolean>;
  onToggle: (key: string, checked: boolean) => void;
  typedName: string;
  onTypedName: (value: string) => void;
  disabled?: boolean;
}

export function ConsentStep({ consents, onToggle, typedName, onTypedName, disabled }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Please confirm each of the following. All certifications are required.
      </p>
      <ul className="space-y-3">
        {consentItems.map((item) => (
          <li key={item.key}>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                disabled={disabled}
                checked={Boolean(consents[item.key])}
                onChange={(e) => onToggle(item.key, e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input text-gold focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t border-border pt-6">
        <Label htmlFor="typed-name">Type your full legal name to certify</Label>
        <Input
          id="typed-name"
          value={typedName}
          disabled={disabled}
          onChange={(e) => onTypedName(e.target.value)}
          placeholder="Full legal name"
          autoComplete="name"
        />
        <p className="text-xs text-muted-foreground">
          Your typed name and a timestamp are recorded as your certification.
        </p>
      </div>
    </div>
  );
}
