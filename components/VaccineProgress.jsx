import { Calendar } from 'lucide-react';

export function VaccineProgress({ patientCode, vaccineTypes, patientVaccineProgress }) {
  if (!patientCode || !vaccineTypes || vaccineTypes.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        Aucune donnée de progression disponible
      </div>
    );
  }

  // Debug: Afficher les données reçues
  console.log('VaccineProgress - Données reçues:', {
    patientCode,
    vaccineTypes: vaccineTypes.map(vt => vt.name),
    patientVaccineProgress // ← Afficher l'objet complet
  });

  // Vérifier si patientVaccineProgress est défini et contient des données pour ce patient
  if (!patientVaccineProgress || patientVaccineProgress[patientCode] === undefined) {
    return (
      <div className="text-center text-gray-500 p-4">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        Chargement de la progression...
      </div>
    );
  }

  const patientProgress = patientVaccineProgress[patientCode];
  console.log('Progression pour', patientCode, ':', patientProgress);

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <Calendar className="w-4 h-4" />
        Progression de vaccination
      </h4>
      
      {vaccineTypes.map((vaccineType) => {
        // Récupérer les données de progression pour ce vaccin
        const vaccineProgress = patientProgress[vaccineType.name];
        
        console.log(`Vaccin ${vaccineType.name}:`, vaccineProgress);

        let currentDoses = 0;
        let isComplete = false;
        const requiredDoses = vaccineType.requiredDoses || 0;

        if (vaccineProgress) {
          currentDoses = vaccineProgress.doseCount || 0;
          isComplete = vaccineProgress.isComplete || false;
        }

        const progressPercentage = requiredDoses > 0 ? (currentDoses / requiredDoses) * 100 : 0;

        return (
          <div key={vaccineType.name} className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{vaccineType.name}</span>
              <span className="text-xs font-semibold">
                {currentDoses} / {requiredDoses} doses
                {currentDoses === 0 && requiredDoses > 0 && (
                  <span className="text-red-500 ml-2">⚠️ Non commencé</span>
                )}
                {isComplete && (
                  <span className="text-green-500 ml-2">✅ Complet</span>
                )}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: isComplete ? '#10b981' : 
                                 currentDoses > 0 ? '#3b82f6' : '#9ca3af'
                }}
              />
            </div>
            
            <div className="flex justify-between text-xs text-gray-600">
              <span>
                {isComplete
                  ? '✅ Complète'
                  : currentDoses === 0
                  ? '⏳ Non commencée'
                  : `⏳ ${requiredDoses - currentDoses} dose(s) restante(s)`}
              </span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}