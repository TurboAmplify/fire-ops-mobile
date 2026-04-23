import { format } from "date-fns";
import type { CrewPayrollLine } from "@/lib/payroll";

interface Props {
  line: CrewPayrollLine;
  organizationName: string;
  periodLabel: string;
  payDate?: Date;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Paystub({ line, organizationName, periodLabel, payDate = new Date() }: Props) {
  const ded = line.deductions;
  const net = line.netPay ?? line.grossPay;

  return (
    <div className="bg-white text-black p-6 max-w-2xl mx-auto" id="paystub-printable">
      <div className="border-b-2 border-black pb-3 mb-4">
        <h1 className="text-xl font-bold">{organizationName}</h1>
        <p className="text-sm">Earnings Statement</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-xs uppercase font-bold text-gray-600">Employee</p>
          <p className="font-semibold">{line.name}</p>
          <p className="text-xs">{line.role}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase font-bold text-gray-600">Pay Period</p>
          <p className="font-semibold">{periodLabel}</p>
          <p className="text-xs">Pay Date: {format(payDate, "MMM d, yyyy")}</p>
        </div>
      </div>

      {line.payMethod === "daily" && line.dailyRate ? (
        <table className="w-full mb-4 text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1.5">Earnings (Flat Daily Rate)</th>
              <th className="text-right py-1.5">Shifts</th>
              <th className="text-right py-1.5">Rate</th>
              <th className="text-right py-1.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-1">Daily Pay</td>
              <td className="text-right py-1">{line.shiftCount ?? 0}</td>
              <td className="text-right py-1">${fmt(line.dailyRate)}</td>
              <td className="text-right py-1">${fmt(line.grossPay)}</td>
            </tr>
            {line.shiftDates && line.shiftDates.length > 0 && (
              <tr>
                <td colSpan={4} className="py-1 text-[11px] text-gray-600">
                  Shift dates: {line.shiftDates.map((d) => format(new Date(d + "T00:00:00"), "MMM d")).join(", ")}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-black font-bold">
              <td className="py-1.5">Gross Pay</td>
              <td></td>
              <td></td>
              <td className="text-right py-1.5">${fmt(line.grossPay)}</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="w-full mb-4 text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1.5">Earnings</th>
              <th className="text-right py-1.5">Hours</th>
              <th className="text-right py-1.5">Rate</th>
              <th className="text-right py-1.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-1">Regular</td>
              <td className="text-right py-1">{line.regularHours.toFixed(2)}</td>
              <td className="text-right py-1">${fmt(line.hourlyRate)}</td>
              <td className="text-right py-1">${fmt(line.regularPay)}</td>
            </tr>
            {line.hwPay > 0 && (
              <tr className="border-b border-gray-300">
                <td className="py-1">Health &amp; Welfare</td>
                <td className="text-right py-1">{line.regularHours.toFixed(2)}</td>
                <td className="text-right py-1">${fmt(line.hwRate)}</td>
                <td className="text-right py-1">${fmt(line.hwPay)}</td>
              </tr>
            )}
            {line.overtimeHours > 0 && (
              <tr className="border-b border-gray-300">
                <td className="py-1">Overtime (1.5x)</td>
                <td className="text-right py-1">{line.overtimeHours.toFixed(2)}</td>
                <td className="text-right py-1">${fmt(line.hourlyRate * 1.5)}</td>
                <td className="text-right py-1">${fmt(line.overtimePay)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-black font-bold">
              <td className="py-1.5">Gross Pay</td>
              <td></td>
              <td></td>
              <td className="text-right py-1.5">${fmt(line.grossPay)}</td>
            </tr>
          </tbody>
        </table>
      )}
      {line.byIncident.length > 1 && (
        <div className="mb-4">
          <p className="text-xs uppercase font-bold text-gray-600 mb-1">Hours by Incident</p>
          <table className="w-full text-xs border-collapse">
            <tbody>
              {line.byIncident.map((inc) => (
                <tr key={(inc.incidentId ?? "_un") + inc.incidentName} className="border-b border-gray-200">
                  <td className="py-1">{inc.incidentName}</td>
                  <td className="text-right py-1">{inc.totalHours.toFixed(2)} hrs</td>
                  <td className="text-right py-1">${fmt(inc.grossPay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ded && (
        <table className="w-full mb-4 text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1.5">Deductions</th>
              <th className="text-right py-1.5">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-1">Federal Withholding ({ded.federalPct.toFixed(2)}%)</td>
              <td className="text-right py-1">−${fmt(ded.federal - ded.extraWithholding)}</td>
            </tr>
            {ded.extraWithholding > 0 && (
              <tr className="border-b border-gray-300">
                <td className="py-1">Extra Federal Withholding</td>
                <td className="text-right py-1">−${fmt(ded.extraWithholding)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-300">
              <td className="py-1">Social Security ({ded.ssPct.toFixed(2)}%)</td>
              <td className="text-right py-1">−${fmt(ded.socialSecurity)}</td>
            </tr>
            <tr className="border-b border-gray-300">
              <td className="py-1">Medicare ({ded.medicarePct.toFixed(2)}%)</td>
              <td className="text-right py-1">−${fmt(ded.medicare)}</td>
            </tr>
            {ded.statePct > 0 && (
              <tr className="border-b border-gray-300">
                <td className="py-1">State ({ded.statePct.toFixed(2)}%)</td>
                <td className="text-right py-1">−${fmt(ded.state)}</td>
              </tr>
            )}
            {ded.other > 0 && (
              <tr className="border-b border-gray-300">
                <td className="py-1">Other</td>
                <td className="text-right py-1">−${fmt(ded.other)}</td>
              </tr>
            )}
            <tr className="border-t-2 border-black font-bold">
              <td className="py-1.5">Total Deductions</td>
              <td className="text-right py-1.5">−${fmt(ded.total)}</td>
            </tr>
          </tbody>
        </table>
      )}

      <div className="border-t-4 border-double border-black pt-3 flex justify-between items-center">
        <span className="text-base font-bold">NET PAY</span>
        <span className="text-2xl font-extrabold">${fmt(net)}</span>
      </div>

      <p className="text-[10px] text-gray-500 mt-6 text-center italic">
        Estimated Withholding — Not Official Tax Calculation. Generated by FireOps HQ for internal
        operational use only. Consult a payroll provider for tax filing and compliance.
      </p>
    </div>
  );
}
