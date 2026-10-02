export interface SignaturePreset {
  id: string;
  name: string;
  description: string;
  payload: string; // JSON string matching { data, templateId }
}

export const presets: SignaturePreset[] = [
  {
    id: "rbs",
    name: "Rangiora Borough School",
    description: "RBS staff signature — green brand, Raleway font",
    payload: JSON.stringify({
      templateId: "modern",
      data: {
        name: "Joe Bloggs",
        title: "Teacher",
        company: "Rangiora Borough School",
        email: "joe.bloggs@rangiora.school.nz",
        phone: "03 313 7434",
        mobile: "",
        website: "rangiora.school.nz",
        address: "64 Church Street, Rangiora",
        tagline: "",
        meetingUrl: "",
        meetingLabel: "Book a meeting",
        disclaimer:
          "<strong>Important:</strong> The contents of this email message and any attachments may be confidential and/or privileged information. The contents are intended for the original email recipients only. If you have received this email in error, please contact Rangiora Borough School immediately and delete this email. Thank you.",
        avatar: "https://school-signatures.netlify.app/logo.png",
        logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSToP5rz4ky9W48e8f3kQ8gdA_b7fyyjP68Eg&s",
        socials: {
          facebook: "",
          linkedin: "",
          twitter: "",
          github: "",
          instagram: "",
          youtube: "",
          tiktok: "",
        },
        accentColor: "#10b981",
        fieldColors: {
          name: "#0e6d34",
          title: "#6b7280",
          body: "#374151",
          muted: "#9ca3af",
        },
        cta: {
          text: "Book a Meeting",
          url: "",
          bgColor: "#10b981",
          textColor: "#ffffff",
        },
        style: {
          fontFamily: "Raleway",
          fontSize: "md",
          fontSizeCustomPx: 13,
          avatarShape: "square",
          avatarSize: "custom",
          avatarSizeCustomPx: 140,
          logoSize: "custom",
          logoSizeCustomPx: 105,
          dividerStyle: "line",
          socialStyle: "icons",
        },
        visibility: {
          avatar: true,
          logo: false,
          socials: false,
          meetingUrl: false,
          cta: false,
          disclaimer: true,
          divider: true,
        },
      },
    }),
  },
];
