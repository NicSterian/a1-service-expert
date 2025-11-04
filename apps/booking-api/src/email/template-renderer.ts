/**
 * TemplateRenderer
 *
 * Abstraction for turning a template id + data into subject/body/html.
 * This is a scaffold for future refactor; not yet wired into EmailService.
 */

export type TemplateRenderInput = {
  template: string; // e.g. 'booking-confirmation'
  data: Record<string, unknown>;
};

export type TemplateRenderOutput = {
  subject: string;
  text?: string;
  html?: string;
};

export interface TemplateRenderer {
  render(input: TemplateRenderInput): Promise<TemplateRenderOutput>;
}

/**
 * NoopTemplateRenderer
 * A minimal default that returns placeholders. Useful as a drop-in while
 * migrating the EmailService to this abstraction.
 */
export class NoopTemplateRenderer implements TemplateRenderer {
  async render(input: TemplateRenderInput): Promise<TemplateRenderOutput> {
    const subject = `[TEMPLATE:${input.template}]`;
    return { subject, text: JSON.stringify(input.data, null, 2) };
  }
}

