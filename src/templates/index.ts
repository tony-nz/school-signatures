import type { SignatureTemplate } from '../types'
import { modernTemplate } from './modern'
import { minimalTemplate } from './minimal'
import { corporateTemplate } from './corporate'
import { boldTemplate } from './bold'
import { compactTemplate } from './compact'
import { stackedTemplate } from './stacked'
import { classicTemplate } from './classic'
import { withBanner } from './helpers'

// Every template gets the footer banner appended beneath it
export const templates: SignatureTemplate[] = [
  modernTemplate,
  stackedTemplate,
  classicTemplate,
  minimalTemplate,
  corporateTemplate,
  boldTemplate,
  compactTemplate,
].map(t => ({ ...t, render: data => withBanner(t.render(data), data) }))
