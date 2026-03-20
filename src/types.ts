export interface Lecturer {
  name: string;
  role: 'Biên soạn' | 'Phản biện' | 'Trưởng bộ môn' | 'Rà soát';
}

export interface SubjectData {
  subjectName: string;
  compilationTeam: string[];
  reviewTeam: string[];
  departmentHead: string;
}

export interface PlanItem {
  stt: number;
  stage: string;
  time: string;
  content: string;
  personInCharge: string;
  output: string;
  notes: string;
}

export interface IndividualPlan {
  lecturerName: string;
  items: PlanItem[];
}
