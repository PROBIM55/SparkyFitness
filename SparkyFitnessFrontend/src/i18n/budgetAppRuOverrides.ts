const budgetAppRuOverrides = {
  nav: {
    medications: 'Лекарства',
  },
  diary: {
    dailyEnergyGoal: 'Дневная цель по калориям',
    noFoodsAddedYet: 'Продукты пока не добавлены',
    noTrendData14Days:
      'За последние 14 дней пока недостаточно данных для динамики',
    waterIntake: {
      defaultContainer: 'Стандартная ёмкость',
    },
    widgets: {
      layout: 'Настроить вид',
      done: 'Готово',
      resetLayout: 'Сбросить расположение',
    },
    calculateExplanation: {
      todayTarget: 'Как рассчитана сегодняшняя цель',
    },
  },
  exercise: {
    dailyProgress: {
      dailyEnergyGoal: 'Дневная цель по калориям',
      eaten: 'съедено',
      burned: 'потрачено',
      goal: 'цель',
      burnedEnergyBreakdown: 'Из чего складывается расход энергии:',
      energyBurnedBreakdownTitle: 'Расход энергии',
      otherExerciseCalories:
        'Другие тренировки: {{exerciseCalories}} {{energyUnit}}',
      activeCalories:
        'Активность: {{activeCaloriesFromExercise}} {{energyUnit}}',
      stepsCalories: 'Шаги: {{dailySteps}} = {{stepsCalories}} {{energyUnit}}',
      bmrCalories: 'Основной обмен: {{bmr}} {{energyUnit}}',
      bmrSourceExternal: 'приложение здоровья',
      totalCaloriesBurned: 'Всего: {{totalCaloriesBurned}} {{energyUnit}}',
      netEnergy: 'Баланс энергии: {{netCalories}}',
      netEnergyBreakdown:
        '{{dailyIntakeCalories}} съедено − {{finalTotalCaloriesBurned}} потрачено',
      dailyProgress: 'Прогресс за день',
    },
  },
  goals: {
    page: {
      editGoals: 'Изменить цели',
      editGoalsFor: 'Цели на {{date}}',
    },
  },
} as const;

export default budgetAppRuOverrides;
