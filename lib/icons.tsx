"use client";

import {
  Check,
  Star,
  Heart,
  Zap,
  Target,
  Trophy,
  Flame,
  Sun,
  Moon,
  Sparkles,
  Dumbbell,
  Bike,
  PersonStanding,
  Footprints,
  Droplets,
  Apple,
  Coffee,
  Utensils,
  Salad,
  BookOpen,
  PenLine,
  GraduationCap,
  Brain,
  Lightbulb,
  Pill,
  Stethoscope,
  BedDouble,
  Clock,
  AlarmClock,
  Music,
  Palette,
  Camera,
  Gamepad2,
  Home,
  Briefcase,
  Wallet,
  Users,
  MessageCircle,
  Phone,
  Mail,
  Dog,
  Cat,
  Smile,
  ThumbsUp,
  PartyPopper,
  Gift,
  type LucideIcon,
} from "lucide-react";

// Catégories d'icônes
export const ICON_CATEGORIES: { name: string; icons: { name: string; icon: LucideIcon }[] }[] = [
  {
    name: "Général",
    icons: [
      { name: "Check", icon: Check },
      { name: "Star", icon: Star },
      { name: "Heart", icon: Heart },
      { name: "Zap", icon: Zap },
      { name: "Target", icon: Target },
      { name: "Trophy", icon: Trophy },
      { name: "Flame", icon: Flame },
      { name: "Sparkles", icon: Sparkles },
    ],
  },
  {
    name: "Sport",
    icons: [
      { name: "Dumbbell", icon: Dumbbell },
      { name: "Bike", icon: Bike },
      { name: "PersonStanding", icon: PersonStanding },
      { name: "Footprints", icon: Footprints },
    ],
  },
  {
    name: "Santé",
    icons: [
      { name: "Droplets", icon: Droplets },
      { name: "Apple", icon: Apple },
      { name: "Salad", icon: Salad },
      { name: "Pill", icon: Pill },
      { name: "Stethoscope", icon: Stethoscope },
      { name: "BedDouble", icon: BedDouble },
    ],
  },
  {
    name: "Travail",
    icons: [
      { name: "BookOpen", icon: BookOpen },
      { name: "PenLine", icon: PenLine },
      { name: "GraduationCap", icon: GraduationCap },
      { name: "Brain", icon: Brain },
      { name: "Lightbulb", icon: Lightbulb },
      { name: "Briefcase", icon: Briefcase },
    ],
  },
  {
    name: "Lifestyle",
    icons: [
      { name: "Coffee", icon: Coffee },
      { name: "Utensils", icon: Utensils },
      { name: "Sun", icon: Sun },
      { name: "Moon", icon: Moon },
      { name: "Clock", icon: Clock },
      { name: "AlarmClock", icon: AlarmClock },
      { name: "Music", icon: Music },
      { name: "Palette", icon: Palette },
    ],
  },
  {
    name: "Social",
    icons: [
      { name: "Users", icon: Users },
      { name: "MessageCircle", icon: MessageCircle },
      { name: "Phone", icon: Phone },
      { name: "Mail", icon: Mail },
      { name: "Home", icon: Home },
      { name: "Wallet", icon: Wallet },
    ],
  },
  {
    name: "Fun",
    icons: [
      { name: "Smile", icon: Smile },
      { name: "ThumbsUp", icon: ThumbsUp },
      { name: "PartyPopper", icon: PartyPopper },
      { name: "Gift", icon: Gift },
      { name: "Gamepad2", icon: Gamepad2 },
      { name: "Camera", icon: Camera },
      { name: "Dog", icon: Dog },
      { name: "Cat", icon: Cat },
    ],
  },
];

// Map pour récupérer l'icône par nom
const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(ICON_CATEGORIES.flatMap((cat) => cat.icons.map((i) => [i.name, i.icon])));

// Composant pour afficher une icône par son nom
export function HabitIcon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const IconComponent = ICON_MAP[name] || Check;
  return <IconComponent size={size} className={className} />;
}
