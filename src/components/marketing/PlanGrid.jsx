import PlanCard from '../PlanCard'
import { PLANS } from '../../data/plans'

// Three plan cards on the landing grid. Wider than the page column on
// purpose: three 384px cards need 1184px to breathe at 16px detail text.
export default function PlanGrid({ className = '' }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 justify-items-center max-w-[74rem] mx-auto ${className}`}>
      {PLANS.map((plan) => (
        <PlanCard key={plan.id} plan={plan} mode="landing" className="w-full max-w-sm" />
      ))}
    </div>
  )
}
