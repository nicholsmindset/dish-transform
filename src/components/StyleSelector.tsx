import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface StyleSelectorProps {
  selectedStyles: string[];
  onStylesChange: (styles: string[]) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
}

const PRESET_STYLES = [
  {
    name: "Clean White Background",
    description: "Studio lighting, pristine white surface - perfect for traditional menus",
    icon: "🤍",
  },
  {
    name: "Rustic Table Setting",
    description: "Natural lighting, wooden table - warm and inviting atmosphere",
    icon: "🪵",
  },
  {
    name: "Dark Moody Background",
    description: "Dramatic lighting, sophisticated aesthetic - upscale fine dining",
    icon: "🌙",
  },
];

const StyleSelector = ({
  selectedStyles,
  onStylesChange,
  customPrompt,
  onCustomPromptChange,
}: StyleSelectorProps) => {
  const [showCustom, setShowCustom] = useState(false);

  const handleStyleToggle = (styleName: string) => {
    if (selectedStyles.includes(styleName)) {
      onStylesChange(selectedStyles.filter((s) => s !== styleName));
    } else {
      onStylesChange([...selectedStyles, styleName]);
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-primary/20">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Choose Enhancement Styles
          </h3>
          <p className="text-sm text-muted-foreground">
            Select specific styles to generate, or leave all unchecked to generate all 3 variations
          </p>
        </div>

        <div className="space-y-3">
          {PRESET_STYLES.map((style) => (
            <div
              key={style.name}
              className="flex items-start gap-3 p-4 rounded-xl bg-background/50 border border-border hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => handleStyleToggle(style.name)}
            >
              <Checkbox
                id={style.name}
                checked={selectedStyles.includes(style.name)}
                onCheckedChange={() => handleStyleToggle(style.name)}
                className="mt-1"
              />
              <div className="flex-1">
                <Label
                  htmlFor={style.name}
                  className="text-base font-medium cursor-pointer flex items-center gap-2"
                >
                  <span className="text-2xl">{style.icon}</span>
                  {style.name}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {style.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Checkbox
              id="custom-style"
              checked={showCustom}
              onCheckedChange={(checked) => {
                setShowCustom(!!checked);
                if (!checked) {
                  onCustomPromptChange("");
                }
              }}
            />
            <Label
              htmlFor="custom-style"
              className="text-base font-medium cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-accent" />
              Custom Enhancement Style
            </Label>
          </div>

          {showCustom && (
            <div className="space-y-2">
              <Textarea
                value={customPrompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                placeholder="Describe your desired style... Example: 'Place on a marble surface with gold accents and soft natural window light'"
                className="min-h-[100px] bg-background"
              />
              <p className="text-xs text-muted-foreground">
                AI will enhance your photo with this custom style while keeping the dish composition identical
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default StyleSelector;
