// The step each poster takes when the ideas wall first arrives (#84). The
// step is multiplied by --motion-stagger in CSS. Past ARRIVAL_CAP, posters
// share the last step, so they rise with the last staggered poster and a long
// wall settles as quickly as a short one. Filtering never uses these steps.
export const ARRIVAL_CAP = 6;

export function arrivalSteps(numbers: number[]): Map<number, number> {
  return new Map(numbers.map((n, index) => [n, Math.min(index, ARRIVAL_CAP - 1)]));
}
