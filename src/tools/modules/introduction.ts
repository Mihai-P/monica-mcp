import { z } from 'zod';
import type { IntroductionInput } from '../../client/MonicaClient.js';
import type { ToolRegistrationContext } from '../context.js';
import { normalizeHowYouMet } from '../../utils/formatters.js';

const firstMetDateSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('exact'),
    day: z.number().int().min(1).max(31),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(1900).max(9999).optional()
  }),
  z.object({
    type: z.literal('age'),
    age: z.number().int().min(0).max(150)
  }),
  z.object({
    type: z.literal('unknown')
  })
]);

export function registerIntroductionTools(context: ToolRegistrationContext): void {
  const { server, client, logger } = context;

  server.registerTool(
    'monica_set_introduction',
    {
      title: 'Set how you met a contact',
      description:
        'Record how you met a contact — Monica\'s "How you met" / introduction section: a free-text story (include where you met here), who introduced you, and when you first met. This is the correct home for first-met facts (NOT a note). The first-met date is optional and may be exact (day and month required; omit year if the year is unknown), age-based, or unknown. Set addReminder to create a yearly anniversary reminder (defaults to false).',
      inputSchema: {
        contactId: z.number().int().positive(),
        generalInformation: z.string().max(65535).optional().nullable(),
        metThroughContactId: z.number().int().positive().optional().nullable(),
        firstMetDate: firstMetDateSchema.optional(),
        addReminder: z.boolean().optional()
      }
    },
    async ({ contactId, generalInformation, metThroughContactId, firstMetDate, addReminder }) => {
      const input: IntroductionInput = {
        generalInformation,
        metThroughContactId,
        firstMetDate,
        addReminder
      };

      const result = await client.setIntroduction(contactId, input);
      const howYouMet = normalizeHowYouMet(
        result.data.information?.how_you_met ?? result.data.how_you_met
      );
      logger.info({ contactId }, 'Updated Monica "how you met" details');

      return {
        content: [
          {
            type: 'text' as const,
            text: `Updated "how you met" details for contact ${contactId}.`
          }
        ],
        structuredContent: {
          contactId,
          howYouMet
        }
      };
    }
  );
}
