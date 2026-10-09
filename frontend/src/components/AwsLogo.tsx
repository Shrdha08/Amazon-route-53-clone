/** Simple "aws" wordmark with an orange smile; an approximation, not the official logo asset. */
export default function AwsLogo({ width = 84, textColor = "#232f3e" }: { width?: number; textColor?: string }) {
  return (
    <svg width={width} viewBox="0 0 100 60" role="img" aria-label="aws" xmlns="http://www.w3.org/2000/svg">
      <text x="50" y="38" textAnchor="middle" fontFamily="'Amazon Ember', 'Open Sans', Arial, sans-serif" fontSize="44" fontWeight="600" fill={textColor}>
        aws
      </text>
      <path d="M12 46 C 38 62, 66 60, 90 44" fill="none" stroke="#ff9900" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M80 41 L91 43.5 L87 53" fill="none" stroke="#ff9900" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
