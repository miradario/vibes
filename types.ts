export type CardItemT = {
  description?: string;
  hasActions?: boolean;
  hasVariant?: boolean;
  variant?: "discover";
  image: any;
  onImagePress?: () => void;
  isOnline?: boolean;
  matches?: string;
  name: string;
  vibe?: string;
  intention?: string;
  prompt?: string;
  tags?: string[];
  images?: any[];
  onContactPress?: () => void;
};

export type IconT = {
  name: any;
  size: number;
  color: string;
  style?: any;
};

export type MessageT = {
  image: any;
  lastMessage: string;
  name: string;
};

export type ProfileItemT = {
  age?: string;
  info1?: string;
  info2?: string;
  info3?: string;
  info4?: string;
  location?: string;
  matches: string;
  name: string;
  meditations?: { title: string; duration: string; access: "Free" | "Paid" }[];
  videos?: { title: string; duration: string; access: "Free" | "Paid" }[];
  events?: { title: string; date: string; location: string; access: "Free" | "Paid" }[];
  shareToCommunity?: boolean;
  pricing?: "Free" | "Paid";
};

export type TabBarIconT = {
  focused: boolean;
  iconName: any;
};

export type DataT = {
  id: number;
  name: string;
  isOnline: boolean;
  match: string;
  description: string;
  message: string;
  image: any;
  images?: any[];
  age?: string;
  info1?: string;
  info2?: string;
  info3?: string;
  info4?: string;
  location?: string;
  vibe?: string;
  intention?: string;
  prompt?: string;
  tags?: string[];
  meditations?: { title: string; duration: string; access: "Free" | "Paid" }[];
  videos?: { title: string; duration: string; access: "Free" | "Paid" }[];
  events?: { title: string; date: string; location: string; access: "Free" | "Paid" }[];
  shareToCommunity?: boolean;
  pricing?: "Free" | "Paid";
};
