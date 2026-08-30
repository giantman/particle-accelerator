import type { ReactNode } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface AccordionSectionProps {
  value: string;
  title: string;
  children: ReactNode;
}

export function AccordionSection({ value, title, children }: AccordionSectionProps) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="px-0 text-sm font-medium text-foreground hover:no-underline">
        {title}
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-3 px-0 pb-4">{children}</AccordionContent>
    </AccordionItem>
  );
}
