import Link from "next/link";
export default function PlanNavigation({id,active}:{id:string;active:"Plan"|"Call Sheet"|"Practice Script"}){
 return active==='Plan'?null:<Link href={`/gameplan?id=${encodeURIComponent(id)}`} className="no-print mb-4 inline-block text-sm font-semibold text-grass">← Game Plans</Link>;
}
