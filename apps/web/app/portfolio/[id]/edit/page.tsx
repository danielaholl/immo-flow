'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { trpc } from '../../../../lib/trpc';
import { Header } from '../../../components/Header';
import { ChevronLeft, ChevronRight, Check, Building2, Loader2 } from 'lucide-react';
import {
  PropertyFormStep,
  PropertyFormData,
  initialPropertyFormData,
  FORM_STEPS,
  validatePropertyFormStep,
  formDataToApiInput,
  propertyToFormData,
} from '../../components/PropertyForm';

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PropertyFormData>(initialPropertyFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof PropertyFormData, string>>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [aiScoreLoading, setAiScoreLoading] = useState(false);

  // Fetch existing property data
  const { data: property, isLoading: propertyLoading } = trpc.portfolio.getById.useQuery(
    { id: propertyId },
    { enabled: !!propertyId }
  );

  const calculateAiScoreMutation = trpc.portfolio.calculateAiScore.useMutation({
    onSuccess: (data) => {
      setAiScore(data.overallScore);
      setAiScoreLoading(false);
    },
    onError: () => {
      setAiScoreLoading(false);
    },
  });

  const handleCalculateAiScore = () => {
    setAiScoreLoading(true);
    // Use property ID for existing properties
    calculateAiScoreMutation.mutate({
      propertyId,
    });
  };

  const updateMutation = trpc.portfolio.update.useMutation({
    onSuccess: () => {
      router.push(`/portfolio/${propertyId}`);
    },
    onError: (error) => {
      console.error('Update error:', error);
      setErrors({
        title: 'Fehler beim Speichern. Bitte versuche es erneut.',
      });
    },
  });

  // Populate form with existing data
  useEffect(() => {
    if (property && !isInitialized) {
      setFormData(propertyToFormData(property));
      // Initialize AI score from property if exists
      if (property.ai_score != null) {
        setAiScore(Number(property.ai_score));
      }
      setIsInitialized(true);
    }
  }, [property, isInitialized]);

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
      router.push(`/portfolio/${propertyId}`);
    }
  };

  const handleSubmit = () => {
    const apiInput = formDataToApiInput(formData);
    updateMutation.mutate({
      id: propertyId,
      data: {
        ...apiInput,
        aiScore: aiScore ?? undefined,
      },
    });
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Immobilie nicht gefunden</p>
            <button
              onClick={() => router.push('/portfolio')}
              className="mt-4 text-[#FF385C] hover:underline"
            >
              Zurück zum Portfolio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/portfolio/${propertyId}`)}
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft size={20} />
            Zurück zur Immobilie
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Immobilie bearbeiten</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {FORM_STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(index)}
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
                  </button>
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
            isEdit={true}
            aiScore={aiScore}
            aiScoreLoading={aiScoreLoading}
            onCalculateAiScore={handleCalculateAiScore}
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
              disabled={updateMutation.isPending}
              className="flex-1 px-6 py-3 bg-[#FF385C] text-white rounded-xl font-medium hover:bg-[#E31C5F] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateMutation.isPending ? (
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
