// Configuración de planes compartida entre el Paywall y el backend de Stripe.
// Pagos de un solo uso (no suscripción) para que Bizum esté disponible en Stripe.

export type PlanId = 'weekly' | 'monthly' | 'quarterly';

export const PLAN_CONFIG: Record<PlanId, {
  name: string;
  amount: number;   // en céntimos de euro
  interval: string;
  days: number;     // días de Pro que concede
}> = {
  weekly:    { name: 'GymRace Pro · Semanal',    amount: 99,  interval: 'a la semana',  days: 7 },
  monthly:   { name: 'GymRace Pro · Mensual',    amount: 299, interval: 'al mes',       days: 30 },
  quarterly: { name: 'GymRace Pro · Trimestral', amount: 499, interval: 'cada 3 meses', days: 90 },
};
