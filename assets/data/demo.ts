import { DataT } from "../../types";
import IMAGE_01 from "../images/01.jpg";
import IMAGE_02 from "../images/02.jpg";
import IMAGE_03 from "../images/03.jpg";
import IMAGE_04 from "../images/04.jpg";
import IMAGE_05 from "../images/05.jpg";
import IMAGE_06 from "../images/06.jpg";
import IMAGE_07 from "../images/07.jpg";
import IMAGE_08 from "../images/08.jpg";
import IMAGE_09 from "../images/09.jpg";
import IMAGE_10 from "../images/10.jpg";

const data: DataT[] = [
  {
    id: 1,
    name: "Ayla Rivers",
    isOnline: true,
    match: "92",
    description:
      "Breathwork guide. Sunrise hiker. Sound bath maker.",
    message:
      "Your energy feels calm. Want to share a morning mantra?",
    vibe: "Grounded",
    intention: "Slow love",
    prompt: "My favorite ritual is sunrise tea and 10 deep breaths.",
    tags: [
      "Path: Ashtanga",
      "Guru: Yes",
      "Practice: Daily",
      "Since: 2018",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_01,
    images: [IMAGE_01, IMAGE_02, IMAGE_03],
  },
  {
    id: 2,
    name: "Noah Vale",
    match: "93",
    description:
      "Meditation nerd. Plant dad. Collector of tiny wonders.",
    isOnline: false,
    message: "Open to a shared intention for this week?",
    vibe: "Curious",
    intention: "Presence",
    prompt: "A lesson I keep relearning is how to soften.",
    tags: [
      "Path: Art of living",
      "Guru: Not yet",
      "Practice: Often",
      "Since: 2020",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_02,
    images: [IMAGE_02, IMAGE_04, IMAGE_05],
  },
  {
    id: 3,
    name: "Lina Sol",
    match: "45",
    description:
      "Yoga teacher. Ocean soul. Writes moon poems.",
    isOnline: false,
    message:
      "If our vibes align, I would love a sunset walk.",
    vibe: "Flowing",
    intention: "Deep talks",
    prompt: "A place that resets me is the shoreline at dusk.",
    tags: [
      "Path: Mix of path",
      "Guru: Yes",
      "Practice: Weekly",
      "Since: 2016",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_03,
    images: [IMAGE_03, IMAGE_06, IMAGE_07],
  },
  {
    id: 4,
    name: "Zion Kade",
    match: "88",
    description:
      "Trail runner. Stargazer. Always chasing alignment.",
    isOnline: true,
    message: "Tell me the song that lifts your spirit.",
    vibe: "Wild calm",
    intention: "Adventure",
    prompt: "My go-to reset is a long run under the stars.",
    tags: [
      "Path: Vikram",
      "Guru: Yes",
      "Practice: Daily",
      "Since: 2015",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_04,
    images: [IMAGE_04, IMAGE_01, IMAGE_08],
  },
  {
    id: 5,
    name: "Mira Bloom",
    match: "76",
    description:
      "Reiki learner. Coffee and cacao. Soft-hearted.",
    isOnline: false,
    message: "Do you like mindful dates or playful ones?",
    vibe: "Tender",
    intention: "Kindness",
    prompt: "I feel most alive during candlelit conversations.",
    tags: [
      "Path: Mix of path",
      "Guru: Not yet",
      "Practice: Often",
      "Since: 2021",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_05,
    images: [IMAGE_05, IMAGE_09, IMAGE_10],
  },
  {
    id: 6,
    name: "Kai Ember",
    match: "95",
    description:
      "Sound healer. Mountain air. Laughs easily.",
    isOnline: true,
    message:
      "What does a balanced week look like for you?",
    vibe: "Radiant",
    intention: "Playful",
    prompt: "My secret joy is humming on hikes.",
    tags: [
      "Path: Ashtanga",
      "Guru: Yes",
      "Practice: Daily",
      "Since: 2014",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_06,
    images: [IMAGE_06, IMAGE_02, IMAGE_08],
  },
  {
    id: 7,
    name: "Iris Vale",
    match: "67",
    description:
      "Tarot reader. Cozy bookworm. Moonlit thinker.",
    isOnline: true,
    message:
      "Want to trade favorite affirmations?",
    vibe: "Mystic",
    intention: "Soulful",
    prompt: "A card that keeps showing up for me is The Star.",
    tags: [
      "Path: Art of living",
      "Guru: Yes",
      "Practice: Often",
      "Since: 2019",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_07,
    images: [IMAGE_07, IMAGE_03, IMAGE_09],
  },
  {
    id: 8,
    name: "Sage Quinn",
    match: "85",
    description:
      "Mindful designer. Cacao lover. Nature first.",
    age: "27",
    location: "Sedona, AZ",
    info1: "Sun: Virgo | Moon: Pisces | Rising: Leo",
    info2: "Practices: breathwork, cacao, sound baths",
    info3: "Seeking: conscious connection and laughter",
    info4: "Vibe today: grounded and open",
    meditations: [
      { title: "Sunrise Breath", duration: "7 min", access: "Free" },
      { title: "Open Heart", duration: "10 min", access: "Paid" },
    ],
    videos: [
      { title: "Grounding Flow", duration: "12 min", access: "Free" },
      { title: "Cacao Ritual", duration: "8 min", access: "Paid" },
    ],
    events: [
      {
        title: "Full Moon Gathering",
        date: "Mar 12",
        location: "Sedona, AZ",
        access: "Free",
      },
      {
        title: "Breath & Sound Circle",
        date: "Mar 24",
        location: "Red Rock Park",
        access: "Paid",
      },
    ],
    shareToCommunity: true,
    pricing: "Paid",
    isOnline: true,
    message:
      "If we match, let's start with a slow walk and a warm drink.",
    vibe: "Gentle",
    intention: "Connection",
    prompt: "A ritual I never skip is a sunset gratitude list.",
    tags: [
      "Path: Mix of path",
      "Guru: Yes",
      "Practice: Daily",
      "Since: 2017",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_08,
    images: [IMAGE_08, IMAGE_04, IMAGE_06],
  },
  {
    id: 9,
    name: "Rowan Skye",
    match: "74",
    description:
      "Forest dweller. Sacred cooking. Big energy.",
    isOnline: true,
    message:
      "What is your favorite grounding practice?",
    vibe: "Earthy",
    intention: "Nourish",
    prompt: "Home for me is a table full of friends.",
    tags: [
      "Path: Vikram",
      "Guru: Not yet",
      "Practice: Weekly",
      "Since: 2022",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_09,
    images: [IMAGE_09, IMAGE_01, IMAGE_05],
  },
  {
    id: 10,
    name: "Juniper Hale",
    match: "98",
    description:
      "Sacred musician. Night sky addict. Soft voice.",
    isOnline: false,
    message:
      "Tell me the song that feels like home.",
    vibe: "Luminous",
    intention: "Harmony",
    prompt: "I feel aligned after a long bath and a good playlist.",
    tags: [
      "Path: Ashtanga",
      "Guru: Yes",
      "Practice: Often",
      "Since: 2013",
      "Vegetarian",
      "Smoke: No",
    ],
    image: IMAGE_10,
    images: [IMAGE_10, IMAGE_02, IMAGE_07],
  },
];

export default data;
