
import React from 'react';
import { 
  Droplets, 
  Footprints, 
  Moon, 
  ShowerHead, 
  Cat, 
  Activity, 
  BatteryCharging,
  BarChart2,
  Home,
  Check,
  X,
  Dumbbell,
  Move,
  ChevronLeft,
  Sun,
  Clock,
  ChevronRight,
  Trash2,
  Plus
} from 'lucide-react';

// Custom Skate Icon as RollerSkating is not available in all versions of lucide-react
const SkateIcon = ({ size = 24, strokeWidth = 2, ...props }: any) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M4 7h11l2 3h4a1 1 0 0 1 1 1v3a2 2 0 0 1-2 2h-2" />
    <path d="M4 7c-1.1 0-2 .9-2 2v5a2 2 0 0 0 2 2h11" />
    <circle cx="5" cy="19" r="2" />
    <circle cx="12" cy="19" r="2" />
    <circle cx="19" cy="19" r="2" />
  </svg>
);

export const Icons = {
  Water: Droplets,
  Exercise: Footprints,
  Sleep: Moon,
  Shower: ShowerHead,
  Animal: Cat,
  Rhythm: Activity,
  Battery: BatteryCharging,
  Stats: BarChart2,
  Home: Home,
  Check: Check,
  Close: X,
  Active: Dumbbell,
  Stretch: Move,
  Back: ChevronLeft,
  Sun: Sun,
  Moon: Moon,
  Clock: Clock,
  Next: ChevronRight,
  Delete: Trash2,
  Add: Plus,
  Skate: SkateIcon
};
