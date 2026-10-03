export interface SignatureSocials {
  facebook?: string
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
  addressLink: boolean
  banner: boolean
}

export type FontFamily = 'Arial' | 'Georgia' | 'Trebuchet MS' | 'Verdana' | 'Raleway' | 'Lato' | 'Nunito' | 'Poppins' | 'Merriweather' | 'Playfair Display'
export type FontSize = 'sm' | 'md' | 'lg' | 'custom'
export type AvatarShape = 'circle' | 'rounded' | 'square'
export type AvatarSize = 'sm' | 'md' | 'lg' | 'custom'
export type DividerStyle = 'line' | 'dots' | 'none'
export type SocialStyle = 'icons' | 'text' | 'both'
// 'auto' keeps each template's own look
export type ContactColor = 'auto' | 'accent' | 'text'
export type ContactLabels = 'auto' | 'none' | 'letters' | 'words'

export interface SignatureStyle {
  fontFamily: FontFamily
  fontSize: FontSize
  fontSizeCustomPx: number
  avatarShape: AvatarShape
  avatarSize: AvatarSize
  avatarSizeCustomPx: number
  avatarPaddingPx: number
  logoShape: AvatarShape
  logoSize: AvatarSize
  logoSizeCustomPx: number // custom width
  logoSizeCustomHeightPx: number // custom height, 0 = auto
  logoPaddingPx: number
  dividerStyle: DividerStyle
  socialStyle: SocialStyle
  contactColor: ContactColor
  contactLabels: ContactLabels
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
  addressUrl: string // custom map link; empty = Google Maps search
  tagline: string
  meetingUrl: string
  meetingLabel: string
  disclaimer: string
  avatar: string
  logo: string
  banner: string
  bannerUrl: string
  bannerWidthPx: number
  socials: SignatureSocials
  accentColor: string
  fieldColors: FieldColors
  cta: SignatureCTA
  style: SignatureStyle
  visibility: SignatureVisibility
  layout: SignatureLayout | null // used by the Custom template
}

// ─── Custom layout (visual builder) ──────────────────────────────────────────

// Palette names follow the signature's colors; anything else is a hex value
export type LayoutColor = 'accent' | 'name' | 'title' | 'body' | 'muted' | (string & {})
export type LayoutSize = 'name' | 'base' | 'meta' | 'small'
export type LayoutField = 'name' | 'title' | 'company' | 'tagline' | 'email' | 'phone' | 'mobile' | 'website' | 'address'

export interface LayoutTextStyle {
  color?: LayoutColor
  size?: LayoutSize
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type LayoutItem =
  | ({ id: string; type: 'field'; field: LayoutField; label?: string; labelColor?: LayoutColor; link?: boolean } & LayoutTextStyle)
  | ({ id: string; type: 'text'; text: string; href?: string } & LayoutTextStyle)
  | ({ id: string; type: 'separator'; text: string } & LayoutTextStyle)
  | { id: string; type: 'image'; source: 'logo' | 'avatar' | 'url'; src: string; width: number; href?: string; shape?: AvatarShape }
  | { id: string; type: 'socials'; color?: LayoutColor }
  | { id: string; type: 'button' }

export type LayoutItemType = LayoutItem['type']

// One line of inline elements
export interface LayoutLine {
  id: string
  type: 'line'
  items: LayoutItem[]
  padTop: number
}

export interface LayoutColumns {
  id: string
  type: 'columns'
  columns: LayoutLine[][]
  gap: number
  padTop: number
}

export type LayoutBlock =
  | LayoutLine
  | LayoutColumns
  | { id: string; type: 'spacer'; height: number }
  | { id: string; type: 'divider'; padTop: number; color?: LayoutColor }
  | { id: string; type: 'banner'; padTop: number }
  | { id: string; type: 'disclaimer'; padTop: number }

export type LayoutBlockType = LayoutBlock['type']

export interface SignatureLayout {
  blocks: LayoutBlock[]
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
