'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '../../../lib/trpc';
import { Header } from '../../components/Header';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  PropertyFormStep,
  PropertyFormData,
  initialPropertyFormData,
  FORM_STEPS,
  validatePropertyFormStep,
  formDataToApiInput,
} from '../components/PropertyForm';

export default function AddPropertyPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PropertyFormData>(initialPropertyFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof PropertyFormData, string>>>({});

  const createMutation = trpc.portfolio.create.useMutation({
    onSuccess: () => {
      router.push('/portfolio');
    },
    onError: (error: any) => {
      if (error.message === 'PROPERTY_LIMIT_REACHED') {
        setErrors({
          title: 'Du hast das Limit von 3 Immobilien erreicht. Upgrade auf Pro für unbegrenzte Immobilien.',
        });
      }
    },
  });

  const updateField = (field: keyof PropertyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (): boolean => {
    const newErrors = validatePropertyFormStep(currentStep, formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < FORM_STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push('/portfolio');
    }
  };

  const handleSubmit = () => {
    createMutation.mutate(formDataToApiInput(formData));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/portfolio')}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft size={20} />
            Zurück zum Portfolio
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Immobilie hinzufügen</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-[#FF385C] text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check size={20} />
                    ) : (
                      <step.icon size={20} />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 ${
                      index <= currentStep ? 'text-gray-900 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < FORM_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <PropertyFormStep
            step={currentStep}
            formData={formData}
            errors={errors}
            updateField={updateField}
          />

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
            <button
              onClick={handleBack}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {currentStep === 0 ? 'Abbrechen' : 'Zurück'}
            </button>
            <button
              onClick={handleNext}
              disabled={createMutation.isPending}
              className="flex-1 px-6 py-3 bg-[#FF385C] text-white rounded-xl font-medium hover:bg-[#E31C5F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : currentStep === FORM_STEPS.length - 1 ? (
                <>
                  <Check size={20} />
                  Speichern
                </>
              ) : (
                <>
                  Weiter
                  <ChevronRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
