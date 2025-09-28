'use client';

import { useState } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Language switcher component
 * @returns {JSX.Element}
 */
export default function LanguageSwitcher() {
  const [currentLanguage, setCurrentLanguage] = useState('fr');
  
  const languages = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' }
  ];

  const changeLanguage = (newLanguage) => {
    setCurrentLanguage(newLanguage);
    // Pour l'instant, on stocke juste la langue sélectionnée
    // L'intégration complète avec i18n peut être ajoutée plus tard
    localStorage.setItem('selectedLanguage', newLanguage);
  };

  const getCurrentLanguageLabel = () => {
    const lang = languages.find(l => l.code === currentLanguage);
    return lang ? lang.label : 'Français';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Languages className="w-4 h-4" />
          {getCurrentLanguageLabel()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={currentLanguage === lang.code ? 'bg-accent' : ''}
          >
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}