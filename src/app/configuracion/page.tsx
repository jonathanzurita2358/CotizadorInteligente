"use client";

import { useEffect, useState } from "react";
import type { SettingsDTO, TechniqueDTO } from "@/lib/client-types";
import type { RoundingMode } from "@/lib/pricing/types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Label,
  Select,
} from "@/components/ui/primitives";

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<SettingsDTO | null>(null);
  const [techniques, setTechniques] = useState<TechniqueDTO[]>([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [settingsRes, techniquesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/techniques?all=true"),
      ]);
      const settingsData = (await settingsRes.json()) as SettingsDTO;
      const techniquesData = (await techniquesRes.json()) as TechniqueDTO[];
      setSettings(settingsData);
      setTechniques(techniquesData);
      const active = techniquesData.find((t) => t.active) ?? techniquesData[0];
      if (active) setSelectedSlug(active.slug);
    })();
  }, []);

  const selected = techniques.find((t) => t.slug === selectedSlug) ?? null;

  function notify(message: string) {
    setStatusMsg(message);
    setTimeout(() => setStatusMsg(null), 3000);
  }

  async function saveGlobalSettings() {
    if (!settings) return;
    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    notify(response.ok ? "Configuración global guardada." : "Error al guardar configuración global.");
  }

  async function saveTechnique() {
    if (!selected) return;
    const response = await fetch("/api/techniques", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: selected.slug,
        name: selected.name,
        active: selected.active,
        config: selected.config,
      }),
    });
    notify(response.ok ? `Técnica "${selected.name}" guardada.` : "Error al guardar la técnica.");
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Configuración</h1>
          <p className="text-sm text-slate-500">
            Ningún precio está fijo en el código: todo sale de estos valores.
          </p>
        </div>
        {statusMsg && <Badge tone="green">{statusMsg}</Badge>}
      </div>

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          {settings && (
            <Card>
              <CardHeader title="Márgenes y redondeo" subtitle="Aplican a todas las técnicas" />
              <CardBody className="space-y-3">
                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <Input
                    id="currency"
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <NumberField
                    id="minMargin"
                    label="Margen mín. %"
                    value={settings.margins.minimumPct}
                    onChange={(v) =>
                      setSettings({ ...settings, margins: { ...settings.margins, minimumPct: v } })
                    }
                  />
                  <NumberField
                    id="recMargin"
                    label="Recomendado %"
                    value={settings.margins.recommendedPct}
                    onChange={(v) =>
                      setSettings({ ...settings, margins: { ...settings.margins, recommendedPct: v } })
                    }
                  />
                  <NumberField
                    id="premMargin"
                    label="Premium %"
                    value={settings.margins.premiumPct}
                    onChange={(v) =>
                      setSettings({ ...settings, margins: { ...settings.margins, premiumPct: v } })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="roundMode">Redondeo</Label>
                    <Select
                      id="roundMode"
                      value={settings.rounding.mode}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          rounding: { ...settings.rounding, mode: e.target.value as RoundingMode },
                        })
                      }
                    >
                      <option value="none">Sin redondeo</option>
                      <option value="up">Hacia arriba</option>
                      <option value="nearest">Más cercano</option>
                    </Select>
                  </div>
                  <NumberField
                    id="roundStep"
                    label="Paso"
                    step="any"
                    value={settings.rounding.step}
                    onChange={(v) => setSettings({ ...settings, rounding: { ...settings.rounding, step: v } })}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Ejemplo: paso 0.25 hacia arriba convierte $21.73 en $22.00.
                </p>
                <Button onClick={() => void saveGlobalSettings()}>Guardar configuración global</Button>
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Técnicas"
              subtitle="Cada técnica tiene sus propios costos operativos"
              action={
                selected ? (
                  <Select
                    value={selectedSlug}
                    onChange={(e) => setSelectedSlug(e.target.value)}
                    className="w-auto"
                  >
                    {techniques.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                        {t.active ? "" : " (inactiva)"}
                      </option>
                    ))}
                  </Select>
                ) : undefined
              }
            />
            {selected && (
              <CardBody className="space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <Label htmlFor="techName">Nombre</Label>
                    <Input
                      id="techName"
                      value={selected.name}
                      onChange={(e) =>
                        setTechniques((prev) =>
                          prev.map((t) => (t.slug === selected.slug ? { ...t, name: e.target.value } : t)),
                        )
                      }
                    />
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={selected.active}
                      onChange={(e) =>
                        setTechniques((prev) =>
                          prev.map((t) =>
                            t.slug === selected.slug ? { ...t, active: e.target.checked } : t,
                          ),
                        )
                      }
                      className="h-4 w-4 accent-red-600"
                    />
                    Activa
                  </label>
                </div>

                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Los valores precargados son ejemplos de arranque: ajústalos a tus costos reales antes de cotizar en producción.
                </p>

                <Section title="Máquina y operativos">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <NumberField
                      label="Costo máquina / min"
                      step="0.01"
                      value={selected.config.machineCostPerMinute}
                      onChange={(v) => updateConfig(selected, setTechniques, "machineCostPerMinute", v)}
                    />
                    <NumberField
                      label="Consumo kW"
                      step="0.01"
                      value={selected.config.electricityKw}
                      onChange={(v) => updateConfig(selected, setTechniques, "electricityKw", v)}
                    />
                    <NumberField
                      label="$ por kWh"
                      step="0.01"
                      value={selected.config.costPerKwh}
                      onChange={(v) => updateConfig(selected, setTechniques, "costPerKwh", v)}
                    />
                    <NumberField
                      label="$ mano de obra / h"
                      step="0.01"
                      value={selected.config.laborRatePerHour}
                      onChange={(v) => updateConfig(selected, setTechniques, "laborRatePerHour", v)}
                    />
                    <NumberField
                      label="Min. mano de obra"
                      value={selected.config.laborMinutes}
                      onChange={(v) => updateConfig(selected, setTechniques, "laborMinutes", v)}
                    />
                    <NumberField
                      label="Mantenimiento mensual $"
                      step="0.01"
                      value={selected.config.maintenanceMonthlyCost}
                      onChange={(v) => updateConfig(selected, setTechniques, "maintenanceMonthlyCost", v)}
                    />
                    <NumberField
                      label="Horas/mes de uso"
                      value={selected.config.maintenanceMonthlyHours}
                      onChange={(v) => updateConfig(selected, setTechniques, "maintenanceMonthlyHours", v)}
                    />
                    <NumberField
                      label="Desperdicio % s/ materiales"
                      step="0.1"
                      value={selected.config.wastePercentOverMaterials}
                      onChange={(v) => updateConfig(selected, setTechniques, "wastePercentOverMaterials", v)}
                    />
                  </div>
                </Section>

                <Section title="Preparación / diseño">
                  <div className="space-y-2">
                    {selected.config.prepOptions.map((prep, index) => (
                      <div key={prep.id} className="grid grid-cols-[1fr_130px] gap-2">
                        <Input
                          value={prep.label}
                          onChange={(e) =>
                            updatePrepOption(selected, setTechniques, index, { label: e.target.value })
                          }
                        />
                        <NumberField
                          step="0.01"
                          value={prep.cost}
                          onChange={(v) => updatePrepOption(selected, setTechniques, index, { cost: v })}
                        />
                      </div>
                    ))}
                  </div>
                </Section>

                <Section title="Segundos extra de grabado">
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="$ por segundo extra"
                      step="0.01"
                      value={selected.config.extraSeconds.costPerSecond}
                      onChange={(v) =>
                        updateExtraSeconds(selected, setTechniques, { costPerSecond: v })
                      }
                    />
                    <NumberField
                      label="Segundos incluidos (prep. compartida)"
                      value={selected.config.extraSeconds.includedSeconds}
                      onChange={(v) =>
                        updateExtraSeconds(selected, setTechniques, { includedSeconds: v })
                      }
                    />
                  </div>
                </Section>

                <Section title="Descuentos por volumen">
                  <div className="space-y-2">
                    {selected.config.volumeDiscounts.map((tier, index) => (
                      <div key={index} className="flex items-end gap-2">
                        <NumberField
                          label={`${index === 0 ? "Cantidad mínima" : "Cantidad"}`}
                          value={tier.minQty}
                          onChange={(v) =>
                            updateTier(selected, setTechniques, index, { minQty: Math.trunc(v) })
                          }
                        />
                        <NumberField
                          label="Descuento %"
                          step="0.5"
                          value={tier.discountPercent}
                          onChange={(v) =>
                            updateTier(selected, setTechniques, index, { discountPercent: v })
                          }
                        />
                        <Button
                          variant="danger"
                          onClick={() =>
                            setTechniques((prev) =>
                              prev.map((t) =>
                                t.slug === selected.slug
                                  ? {
                                      ...t,
                                      config: {
                                        ...t.config,
                                        volumeDiscounts: t.config.volumeDiscounts.filter(
                                          (_, i) => i !== index,
                                        ),
                                      },
                                    }
                                  : t,
                              ),
                            )
                          }
                        >
                          Quitar
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setTechniques((prev) =>
                          prev.map((t) =>
                            t.slug === selected.slug
                              ? {
                                  ...t,
                                  config: {
                                    ...t.config,
                                    volumeDiscounts: [
                                      ...t.config.volumeDiscounts,
                                      { minQty: 10, discountPercent: 5 },
                                    ],
                                  },
                                }
                              : t,
                          ),
                        )
                      }
                    >
                      + Agregar nivel
                    </Button>
                  </div>
                </Section>

                <Button onClick={() => void saveTechnique()}>
                  Guardar técnica “{selected.name}”
                </Button>
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      {children}
    </fieldset>
  );
}

function NumberField({
  id,
  label,
  value,
  step = "1",
  onChange,
}: {
  id?: string;
  label?: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Input
        id={id}
        type="number"
        step={step}
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="py-1.5 text-xs"
      />
    </div>
  );
}

function updateConfig(
  technique: TechniqueDTO,
  setTechniques: React.Dispatch<React.SetStateAction<TechniqueDTO[]>>,
  key: keyof TechniqueDTO["config"],
  value: number,
) {
  setTechniques((prev) =>
    prev.map((t) => (t.slug === technique.slug ? { ...t, config: { ...t.config, [key]: value } } : t)),
  );
}

function updatePrepOption(
  technique: TechniqueDTO,
  setTechniques: React.Dispatch<React.SetStateAction<TechniqueDTO[]>>,
  index: number,
  patch: Partial<{ label: string; cost: number }>,
) {
  setTechniques((prev) =>
    prev.map((t) =>
      t.slug === technique.slug
        ? {
            ...t,
            config: {
              ...t.config,
              prepOptions: t.config.prepOptions.map((p, i) => (i === index ? { ...p, ...patch } : p)),
            },
          }
        : t,
    ),
  );
}

function updateExtraSeconds(
  technique: TechniqueDTO,
  setTechniques: React.Dispatch<React.SetStateAction<TechniqueDTO[]>>,
  patch: Partial<TechniqueDTO["config"]["extraSeconds"]>,
) {
  setTechniques((prev) =>
    prev.map((t) =>
      t.slug === technique.slug
        ? { ...t, config: { ...t.config, extraSeconds: { ...t.config.extraSeconds, ...patch } } }
        : t,
    ),
  );
}

function updateTier(
  technique: TechniqueDTO,
  setTechniques: React.Dispatch<React.SetStateAction<TechniqueDTO[]>>,
  index: number,
  patch: Partial<{ minQty: number; discountPercent: number }>,
) {
  setTechniques((prev) =>
    prev.map((t) =>
      t.slug === technique.slug
        ? {
            ...t,
            config: {
              ...t.config,
              volumeDiscounts: t.config.volumeDiscounts.map((tier, i) =>
                i === index ? { ...tier, ...patch } : tier,
              ),
            },
          }
        : t,
    ),
  );
}
