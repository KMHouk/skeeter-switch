import { app, InvocationContext, Timer } from '@azure/functions';
import { runEvaluationCycle } from '../../shared/evaluation';
import { logEvent, updateSystemHealth } from '../../shared/storage';

app.timer('evaluate', {
  schedule: '0 */5 * * * *',
  handler: async (_timer: Timer, _context: InvocationContext): Promise<void> => {
    try {
      const outcome = await runEvaluationCycle('timer');
      if (!outcome) return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown evaluation error';
      const timestamp = new Date().toISOString();
      console.error(JSON.stringify({ event: 'evaluation_error', error: message }));
      await updateSystemHealth({ alertStatus: 'error', lastEvaluationAt: timestamp });
      await logEvent({
        id: '',
        timestamp,
        type: 'evaluation',
        success: false,
        error: message,
        reasons: ['Evaluation failed'],
      });
    }
  },
});
