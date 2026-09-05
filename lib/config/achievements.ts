// real thrustmit results, update as new competitions and milestones land
export type Achievement = {
  title: string;
  description: string;
  url?: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    title: "Varuna, IREC 2026",
    description:
      "flew a rocket with a fully student researched and developed solid motor, indigenous flight computer, and custom avionics, earning an honorable mention in the SDL Payload Challenge",
    url: "https://www.electronicsforu.com/news/indias-first-student-built-rocket-with-indigenous-flight-computer",
  },
  {
    title: "Vayu Vega, IREC 2025",
    description:
      "reached 29,432 ft, 4th place in the 30K COTS category among 21 teams, plus 2nd place in the SDL Payload Challenge for onboard real time 3D flight tracking",
    url: "https://www.thrustmit.in/",
  },
  {
    title: "AgniAstra, 2024",
    description:
      "India's first student built 30,000 ft class sounding rocket approved by Spaceport America, crossed the sound barrier at 1.8 Mach, 7th globally in Technical Report and top team in Asia",
    url: "https://www.thrustmit.in/",
  },
  {
    title: "Granted patent",
    description:
      "the Indian Patent Office granted a patent for a thrustMIT innovation, an ejection system developed by team alumni",
    url: "https://in.linkedin.com/company/thrustmit",
  },
  {
    title: "Best paper, ICAME 2024",
    description:
      "recognized for research on a KNSB based solid rocket motor design for sounding rockets",
    url: "https://in.linkedin.com/company/thrustmit",
  },
  {
    title: "Spaceport America Cup 2023",
    description:
      "reached roughly 10,000 ft, close to the 10,331 ft target apogee, with a fully intact recovery",
  },
  {
    title: "Est. 2016",
    description:
      "started as a small group of rocket enthusiasts, now India's top rocketry team and one of the leading teams in Asia",
    url: "https://in.linkedin.com/company/thrustmit",
  },
];
