interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    id: number;
    label: string;
  }>;
}

const WizardProgress = ({ currentStep, totalSteps, steps }: WizardProgressProps) => {
  const progressPercentage = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 bg-card p-6 rounded-xl text-card-foreground shadow-sm border border-border">
      {/* Horizontal Steps */}
      <div className="relative flex justify-between items-center mb-8 px-2">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-0 w-full h-0.5 bg-muted -z-0" />
        {/* Active Progress Line */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-700 ease-in-out -z-0"
          style={{ width: `${progressPercentage}%` }}
        />

        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;

          return (
            <div key={index} className="relative z-10 flex flex-col items-center group">
              {/* Step Circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 border-2 ${isActive
                  ? 'bg-primary border-primary text-primary-foreground scale-110 shadow-md'
                  : isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-card border-border text-muted-foreground'
                  }`}
              >
                {isCompleted ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>

              {/* Step Label */}
              <div className="absolute -bottom-8 w-max whitespace-nowrap">
                <span className={`text-[11px] font-semibold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-primary' : isCompleted ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Current Step Info */}
      <div className="flex items-end justify-between pt-4 border-t border-border mt-4">
        <div className="flex flex-col">
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">
            Visualizando Passo
          </p>
          <h3 className="text-xl font-bold tracking-tight text-foreground uppercase">
            {currentStep}. {steps[currentStep - 1]?.label}
          </h3>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-2xl font-bold text-primary leading-none mb-1">
            {progressPercentage}%
          </div>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            Completo
          </p>
        </div>
      </div>
    </div>
  );
};

export default WizardProgress;
