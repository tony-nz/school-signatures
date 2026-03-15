export interface SignatureSocials {
  linkedin?: string
  twitter?: string
  github?: string
  instagram?: string
  youtube?: string
  tiktok?: string
}

export interface SignatureCTA {
  text: string
  url: string
  bgColor: string
  textColor: string
}

export interface SignatureVisibility {
  avatar: boolean
  logo: boolean
  socials: boolean
  meetingUrl: boolean
  cta: boolean
  disclaimer: boolean
  divider: boolean
}

export type FontFamily = 'Arial' | 'Georgia' | 'Trebuchet MS' | 'Verdana' | 'Raleway' | 'Lato' | 'Nunito' | 'Poppins' | 'Merriweather' | 'Playfair Display'
export type FontSize = 'sm' | 'md' | 'lg' | 'custom'
export type AvatarShape = 'circle' | 'rounded' | 'square'
export type AvatarSize = 'sm' | 'md' | 'lg' | 'custom'
export type DividerStyle = 'line' | 'dots' | 'none'
export type SocialStyle = 'icons' | 'text' | 'both'

export interface SignatureStyle {
  fontFamily: FontFamily
  fontSize: FontSize
  fontSizeCustomPx: number
  avatarShape: AvatarShape
  avatarSize: AvatarSize
  avatarSizeCustomPx: number
  logoSize: AvatarSize
  logoSizeCustomPx: number
  dividerStyle: DividerStyle
  socialStyle: SocialStyle
}

export interface FieldColors {
  name: string
  title: string
  body: string
  muted: string
}

export interface SignatureData {
  name: string
  title: string
  company: string
  email: string
  phone: string
  mobile: string
  website: string
  address: string
  tagline: string
  meetingUrl: string
  meetingLabel: string
  disclaimer: string
  avatar: string
  logo: string
  socials: SignatureSocials
  accentColor: string
  fieldColors: FieldColors
  cta: SignatureCTA
  style: SignatureStyle
  visibility: SignatureVisibility
}

export interface SignatureTemplate {
  id: string
  name: string
  description: string
  render: (data: SignatureData) => string
}

export type ExportTarget = 'gmail' | 'macmail' | 'outlook' | 'html'

export interface BulkRow {
  id: string
  name: string
  title: string
  email: string
  phone: string
  mobile: string
  website: string
  address: string
  tagline: string
  avatar: string
}
