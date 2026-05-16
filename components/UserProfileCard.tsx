import React from "react";
import CardItem from "./CardItem";
import { useAuthSession } from "../src/auth/auth.queries";
import { useSharedActivitiesQuery } from "../src/queries/sharedActivities.queries";
import type { SpiritualPathDetails } from "../src/lib/spiritualPaths";

export type UserProfileCardData = {
  id?: string;
  image: any;
  name: string;
  age?: string;
  location?: string;
  distanceLabel?: string;
  description?: string;
  vibe?: string;
  intention?: string;
  prompt?: string;
  tags?: string[];
  preferences?: string[];
  spiritualPath?: string[];
  spiritualPathDetails?: SpiritualPathDetails;
  vegetarian?: string;
  smoking?: string;
  pets?: string;
  images?: any[];
  match?: string;
};

type Props = {
  profile: UserProfileCardData | null;
  onContactPress?: () => void;
  secondaryActionLabel?: string;
  onSecondaryActionPress?: () => void;
  onImagePress?: (image?: any, index?: number) => void;
};

const UserProfileCard = ({
  profile,
  onContactPress,
  secondaryActionLabel,
  onSecondaryActionPress,
  onImagePress,
}: Props) => {
  const { data: session } = useAuthSession();
  const currentUserId = session?.user?.id;
  const otherUserId = profile?.id;
  const { data: sharedActivities } = useSharedActivitiesQuery(
    currentUserId,
    otherUserId,
  );
  if (!profile) return null;

  return (
    <CardItem
      variant="discover"
      image={profile.image}
      name={profile.name}
      age={profile.age}
      location={profile.location}
      distanceLabel={profile.distanceLabel}
      description={profile.description}
      vibe={profile.vibe}
      intention={profile.intention}
      prompt={profile.prompt}
      tags={profile.tags}
      preferences={profile.preferences}
      sharedEvents={sharedActivities?.events}
      sharedChallenges={sharedActivities?.challenges}
      spiritualPath={profile.spiritualPath}
      spiritualPathDetails={profile.spiritualPathDetails}
      vegetarian={profile.vegetarian}
      smoking={profile.smoking}
      pets={profile.pets}
      images={profile.images}
      matches={profile.match}
      onImagePress={onImagePress}
      onContactPress={onContactPress}
      secondaryActionLabel={secondaryActionLabel}
      onSecondaryActionPress={onSecondaryActionPress}
    />
  );
};

export default UserProfileCard;
