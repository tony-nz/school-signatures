import type { SignatureTemplate } from '../types'
import { modernTemplate } from './modern'
import { minimalTemplate } from './minimal'
import { corporateTemplate } from './corporate'
import { boldTemplate } from './bold'
import { compactTemplate } from './compact'
import { stackedTemplate } from './stacked'
import { classicTemplate } from './classic'
import { customTemplate } from './custom'
import { withBanner } from './helpers'

// Every built-in template gets the footer banner appended beneath it;
// the Custom template places it wherever its layout says
export const templates: SignatureTemplate[] = [
  modernTemplate,
  stackedTemplate,
  classicTemplate,
  minimalTemplate,
  corporateTemplate,
  boldTemplate,
  compactTemplate,
].map((t): SignatureTemplate => ({ ...t, render: data => withBanner(t.render(data), data) }))
  .concat(customTemplate)
