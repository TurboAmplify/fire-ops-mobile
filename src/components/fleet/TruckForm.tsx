import { useState } from "react";
import { useOrganization } from "@/hooks/useOrganization";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Truck, TruckInsert, TruckUpdate } from "@/services/fleet";
import { TRUCK_STATUS_LABELS, type TruckStatus } from "@/services/fleet";

interface TruckFormProps {
  truck?: Truck | null;
  onSubmit: (data: TruckInsert | TruckUpdate) => Promise<void>;
  isPending: boolean;
}

export function TruckForm({ truck, onSubmit, isPending }: TruckFormProps) {
  const { membership } = useOrganization();
  const [name, setName] = useState(truck?.name ?? "");
  const [status, setStatus] = useState<TruckStatus>((truck?.status as TruckStatus) ?? "available");
  const [unitType, setUnitType] = useState(truck?.unit_type ?? "");
  const [make, setMake] = useState(truck?.make ?? "");
  const [model, setModel] = useState(truck?.model ?? "");
  const [year, setYear] = useState(truck?.year?.toString() ?? "");
  const [plate, setPlate] = useState(truck?.plate ?? "");
  const [vin, setVin] = useState(truck?.vin ?? "");
  const [waterCapacity, setWaterCapacity] = useState(truck?.water_capacity ?? "");
  const [pumpType, setPumpType] = useState(truck?.pump_type ?? "");
  const [dotNumber, setDotNumber] = useState(truck?.dot_number ?? "");
  const [currentMileage, setCurrentMileage] = useState(truck?.current_mileage?.toString() ?? "");
  const [notes, setNotes] = useState(truck?.notes ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: TruckInsert | TruckUpdate = {
      name: name.trim(),
      status,
      unit_type: unitType.trim() || null,
      make: make.trim() || null,
      model: model.trim() || null,
      year: year ? parseInt(year) : null,
      plate: plate.trim() || null,
      vin: vin.trim() || null,
      water_capacity: waterCapacity.trim() || null,
      pump_type: pumpType.trim() || null,
      dot_number: dotNumber.trim() || null,
      current_mileage: currentMileage ? parseInt(currentMileage) : null,
      notes: notes.trim() || null,
      ...(truck ? {} : { organization_id: membership?.organizationId }),
    };
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Truck Name / Number *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. DL31"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as TruckStatus)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(TRUCK_STATUS_LABELS) as [TruckStatus, string][]).map(
              ([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unitType">Unit Type</Label>
        <Input
          id="unitType"
          value={unitType}
          onChange={(e) => setUnitType(e.target.value)}
          placeholder="e.g. Type 6 Engine"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="make">Make</Label>
          <Input id="make" value={make} onChange={(e) => setMake(e.target.value)} placeholder="Ford" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="F-550" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input id="year" type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2022" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="plate">Plate</Label>
          <Input id="plate" value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC-1234" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="vin">VIN</Label>
        <Input id="vin" value={vin} onChange={(e) => setVin(e.target.value)} placeholder="1FDUF5HT..." />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="waterCapacity">Water Capacity</Label>
          <Input id="waterCapacity" value={waterCapacity} onChange={(e) => setWaterCapacity(e.target.value)} placeholder="300 gal" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pumpType">Pump Type</Label>
          <Input id="pumpType" value={pumpType} onChange={(e) => setPumpType(e.target.value)} placeholder="Waterous" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dotNumber">DOT Number</Label>
        <Input id="dotNumber" value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} placeholder="DOT #" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
      </div>

      <button
        type="submit"
        disabled={isPending || !name.trim()}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground touch-target disabled:opacity-50"
      >
        {isPending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : truck ? "Save Changes" : "Add Truck"}
      </button>
    </form>
  );
}
