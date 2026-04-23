export const STATION_MAP = {
  Station_30_Result: "OP30 - FETLING",
  Station_31_Result: "OP40 - HEAT TREATMENT",
  Station_32_Result: "OP50 - PDI",
  Station_100_Result: "OP60 - OP60A / OP60B",
  Station_200_Result: "OP70 - OP70A / OP70B / OP70C",
  Station_300_Result: "OP80/90 - OP80A / OP90A / OP80B / OP90B / OP80C / OP90C",
  Station_9_Result:   "OP100 - DEBURRING",
  Station_10_Result:  "OP110 - PRE WASHING",
  Station_11_Result:  "OP120 - MANUAL PDI",
  Station_12_Result:  "OP130 - LEAK TEST 1",
  Station_13_Result:  "OP135 - CMM",
  Station_14_Result:  "OP140 - DOWEL PRESSING",
  Station_15_Result:  "OP150 - ULTRASONIC WASHING",
  Station_16_Result:  "OP160 - PLUGGING",
  Station_17_Result:  "OP170 - LEAK TEST 2",
  Station_18_Result:  "OP180 - LASER MARKING",
  Station_19_Result:  "OP190 - FINAL INSPECTION",
  T1: "T1",
  T2: "T2",
  T3: "T3",
  Trolley: "Trolley",
  In_Time: "In Time",
  Out_Time: "Out Time",
};

export const STATION_DETAIL_KEYS = [
  "T1",
  "T2",
  "T3",
  "Trolley",
  "In_Time",
  "Out_Time",
  "Internal_Leak",
  "External_Leak",
  "Final_Marking",
];

export const HEAT_TREATMENT_PARENT_KEY = "Station_31_Result";
export const HEAT_TREATMENT_SUB_COLUMNS = [
  { key: "Station_31_Result", label: "OP40 - HEAT TREATMENT" },
  { key: "T1", label: "T1" },
  { key: "T2", label: "T2" },
  { key: "T3", label: "T3" },
  { key: "Trolley", label: "Trolley" },
  { key: "In_Time", label: "In" },
  { key: "Out_Time", label: "Out" },
];
export const LEAK_TESTING_PARENT_KEY = "Station_17_Result";
export const LEAK_TESTING_SUB_COLUMNS = [
  { key: "Station_17_Result", label: "OP170 - LEAK TEST 2" },
  { key: "Internal_Leak", label: "Internal" },
  { key: "External_Leak", label: "External" },
];
export const MARKING_PARENT_KEY = "Station_18_Result";
export const MARKING_SUB_COLUMNS = [
  { key: "Station_18_Result", label: "OP180 - LASER MARKING" },
  { key: "Final_Marking", label: "Final Marking" },
];

export const GROUPED_STATION_COLUMNS = {
  [HEAT_TREATMENT_PARENT_KEY]: HEAT_TREATMENT_SUB_COLUMNS,
  [LEAK_TESTING_PARENT_KEY]: LEAK_TESTING_SUB_COLUMNS,
  [MARKING_PARENT_KEY]: MARKING_SUB_COLUMNS,
};

export const VISIBLE_STATION_KEYS = [
  "Station_30_Result",
  "Station_31_Result",
  "Station_32_Result",
  "Station_100_Result",
  "Station_200_Result",
  "Station_300_Result",
  "Station_9_Result",
  "Station_10_Result",
  "Station_11_Result",
  "Station_12_Result",
  "Station_13_Result",
  "Station_14_Result",
  "Station_15_Result",
  "Station_16_Result",
  "Station_17_Result",
  "Station_18_Result",
  "Station_19_Result",
];

export const STATION_SUB_VALUES = {
  Station_31_Result: HEAT_TREATMENT_SUB_COLUMNS,
  Station_17_Result: LEAK_TESTING_SUB_COLUMNS,
  Station_18_Result: MARKING_SUB_COLUMNS,
};
