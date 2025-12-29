'use client';

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { investorFAQs, verkaufFAQs, maklerFAQs, sucherFAQs } from '../data';

type UserType = 'sucher' | 'investor' | 'verkaeufer' | 'makler';

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQItem({ question, answer, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-0">
      <button
        onClick={onToggle}
        className="w-full py-5 flex items-center justify-between text-left hover:text-primary transition-colors"
      >
        <span className="font-medium text-gray-900 dark:text-white">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-40 pb-5' : 'max-h-0'
        }`}
      >
        <p className="text-gray-600 dark:text-gray-300">{answer}</p>
      </div>
    </div>
  );
}

interface PricingFAQProps {
  userType: UserType;
}

export default function PricingFAQ({ userType }: PricingFAQProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Reset open FAQ when switching tabs
  useEffect(() => {
    setOpenIndex(null);
  }, [userType]);

  const faqs =
    userType === 'sucher'
      ? sucherFAQs
      : userType === 'investor'
        ? investorFAQs
        : userType === 'verkaeufer'
          ? verkaufFAQs
          : maklerFAQs;

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="max-w-3xl mx-auto px-4 py-16">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
        Häufig gestellte Fragen
      </h2>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md dark:shadow-gray-900/50 p-6">
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>
    </section>
  );
}
