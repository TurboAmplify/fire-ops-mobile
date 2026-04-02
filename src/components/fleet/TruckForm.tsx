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
  const t = truck as any;
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
  // New fields
  const [weightEmpty, setWeightEmpty] = useState(t?.weight_empty?.toString() ?? "");
  const [weightFull, setWeightFull] = useState(t?.weight_full?.toString() ?? "");
  const [gvwr, setGvwr] = useState(t?.gvwr?.toString() ?? "");
  const [fuelCapacity, setFuelCapacity] = useState(t?.fuel_capacity?.toString() ?? "");
  const [fuelType, setFuelType] = useState(t?.fuel_type ?? "");
  const [engineType, setEngineType] = useState(t?.engine_type ?? "");
  const [bedLength, setBedLength] = useState(t?.bed_length ?? "");
  const [insuranceExpiry, setInsuranceExpiry] = useState(t?.insurance_expiry ?? "");
  const [registrationExpiry, setRegistrationExpiry] = useState(t?.registration_expiry ?? "");
  const [lastOilChangeDate, setLastOilChangeDate] = useState(t?.last_oil_change_date ?? "");
  const [lastOilChangeMileage, setLastOilChangeMileage] = useState(t?.last_oil_change_mileage?.toString() ?? "");
  const [nextOilChangeMileage, setNextOilChangeMileage] = useState(t?.next_oil_change_mileage?.toString() ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
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
      weight_empty: weightEmpty ? parseInt(weightEmpty) : null,
      weight_full: weightFull ? parseInt(weightFull) : null,
      gvwr: gvwr ? parseInt(gvwr) : null,
      fuel_capacity: fuelCapacity ? parseInt(fuelCapacity) : null,
      fuel_type: fuelType.trim() || null,
      engine_type: engineType.trim() || null,
      bed_length: bedLength.trim() || null,
      insurance_expiry: insuranceExpiry || null,
      registration_expiry: registrationExpiry || null,
      last_oil_change_date: lastOilChangeDate || null,
      last_oil_change_mileage: lastOilChangeMileage ? parseInt(lastOilChangeMileage) : null,
      next_oil_change_mileage: nextOilChangeMileage ? parseInt(nextOilChangeMileage) : null,
      ...(truck ? {} : { organization_id: membership?.organizationId }),
    };
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic Info */}
      <SectionLabel>Basic Info</SectionLabel>

      <div className="space-y-2">
        <Label htmlFor="name">Truck Name / Number *</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DL31" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as TruckStatus)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.entries(TRUCK_STATUS_LABELS) as [TruckStatus, string][]).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unitType">Unit Type</Label>
        <Input id="unitType" value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="e.g. Type 6 Engine" />
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
          <Label htmlFor="engineType">Engine Type</Label>
          <Input id="engineType" value={engineType} onChange={(e) => setEngineType(e.target.value)} placeholder="6.7L Diesel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bedLength">Bed Length</Label>
          <Input id="bedLength" value={bedLength} onChange={(e) => setBedLength(e.target.value)} placeholder="12 ft" />
        </div>
      </div>

      {/* Weight & Capacity */}
      <SectionLabel>Weight & Capacity</SectionLabel>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="weightEmpty">Weight Empty (lbs)</Label>
          <Input id="weightEmpty" type="number" value={weightEmpty} onChange={(e) => setWeightEmpty(e.target.value)} placeholder="14000" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weightFull">Weight Full (lbs)</Label>
          <Input id="weightFull" type="number" value={weightFull} onChange={(e) => setWeightFull(e.target.value)} placeholder="19500" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="gvwr">GVWR (lbs)</Label>
        <Input id="gvwr" type="number" value={gvwr} onChange={(e) => setGvwr(e.target.value)} placeholder="19500" />
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="fuelCapacity">Fuel Capacity (gal)</Label>
          <Input id="fuelCapacity" type="number" value={fuelCapacity} onChange={(e) => setFuelCapacity(e.target.value)} placeholder="65" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fuelType">Fuel Type</Label>
          <Select value={fuelType || "none"} onValueChange={(v) => setFuelType(v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">--</SelectItem>
              <SelectItem value="Diesel">Diesel</SelectItem>
              <SelectItem value="Gasoline">Gasoline</SelectItem>
              <SelectItem value="E85">E85</SelectItem>
              <SelectItem value="Propane">Propane</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Compliance */}
      <SectionLabel>Compliance</SectionLabel>

      <div className="space-y-2">
        <Label htmlFor="dotNumber">DOT Number</Label>
        <Input id="dotNumber" value={dotNumber} onChange={(e) => setDotNumber(e.target.value)} placeholder="DOT #" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="registrationExpiry">Registration Exp.</Label>
          <Input id="registrationExpiry" type="date" value={registrationExpiry} onChange={(e) => setRegistrationExpiry(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="insuranceExpiry">Insurance Exp.</Label>
          <Input id="insuranceExpiry" type="date" value={insuranceExpiry} onChange={(e) => setInsuranceExpiry(e.target.value)} />
        </div>
      </div>

      {/* Maintenance */}
      <SectionLabel>Maintenance</SectionLabel>

      <div className="space-y-2">
        <Label htmlFor="currentMileage">Current Mileage</Label>
        <Input id="currentMileage" type="number" value={currentMileage} onChange={(e) => setCurrentMileage(e.target.value)} placeholder="Miles" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="lastOilChangeDate">Last Oil Change</Label>
          <Input id="lastOilChangeDate" type="date" value={lastOilChangeDate} onChange={(e) => setLastOilChangeDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastOilChangeMileage">At Mileage</Label>
          <Input id="lastOilChangeMileage" type="number" value={lastOilChangeMileage} onChange={(e) => setLastOilChangeMileage(e.target.value)} placeholder="Miles" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="nextOilChangeMileage">Next Oil Change (mi)</Label>
        <Input id="nextOilChangeMileage" type="number" value={nextOilChangeMileage} onChange={(e) => setNextOilChangeMileage(e.target.value)} placeholder="Miles" />
      </div>

      {/* Notes */}
      <SectionLabel>Notes</SectionLabel>

      <div className="space-y-2">
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2 border-t border-border">
      {children}
    </p>
  );
}
