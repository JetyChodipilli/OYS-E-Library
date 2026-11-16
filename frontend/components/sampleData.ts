/** Explicit preview fixtures. All published metrics and material cards are DEMO data. */
export type AccessType = "Free" | "Premium";
export type Sector = "Engineering" | "IT" | "Private Jobs" | "Government Jobs";
export type Material = {
  id: string;
  title: string;
  sector: Sector;
  category: string;
  subcategory?: string;
  subject: string;
  description: string;
  cover: string;
  access: AccessType;
  trending: boolean;
  progress?: number;
  pages: number;
  addedAt: string;
  updatedAt: string;
};
export const sectors: Sector[] = ["Engineering", "IT", "Private Jobs", "Government Jobs"];

type Meta = Omit<Material, "description" | "addedAt" | "updatedAt">;
function sample(data: Meta, description: string, index: number): Material {
  const day = String(Math.max(1, 16 - index % 15)).padStart(2, "0");
  return {...data, description, addedAt: `2026-11-${day}`, updatedAt: `2026-11-${String(Math.min(16, Number(day) + 1)).padStart(2, "0")}`};
}
const it = "IT" as const;
const eng = "Engineering" as const;
const pr = "Private Jobs" as const;
const gov = "Government Jobs" as const;
export const materials: Material[] = [
  sample({id: "java", title: "Java Fundamentals", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: true, progress: 33, pages: 42}, "Core syntax, data types, methods and object-oriented programming.", 0),
  sample({id: "advanced", title: "Advanced Java", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/advanced.svg", access: "Premium", trending: true, pages: 104}, "Concurrency, JVM performance and backend architectures.", 1),
  sample({id: "java-oop", title: "Object-Oriented Java", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: false, pages: 36}, "Encapsulation, inheritance, polymorphism and interfaces.", 2),
  sample({id: "java-collections", title: "Java Collections", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: false, pages: 55}, "Collections framework, lists, maps and sets.", 3),
  sample({id: "java-streams", title: "Java Streams", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/advanced.svg", access: "Premium", trending: false, pages: 49}, "Functional-style processing and stream pipelines.", 4),
  sample({id: "springboot", title: "Spring Boot Basics", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/spring.svg", access: "Free", trending: true, pages: 67}, "Controllers, dependency injection and data access.", 5),
  sample({id: "java-testing", title: "Java Unit Testing", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: false, pages: 37}, "Unit tests, assertions and mocking basics.", 6),
  sample({id: "java-errors", title: "Java Exception Handling", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: false, pages: 32}, "Checked exceptions, handling patterns and recovery.", 7),
  sample({id: "java-jdbc", title: "Java Database Connectivity", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/advanced.svg", access: "Premium", trending: false, pages: 56}, "JDBC drivers, statements and result processing.", 8),
  sample({id: "java-interview", title: "Java Interview Preparation", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: false, pages: 60}, "Commonly tested Java concepts and scenarios.", 9),
  sample({id: "java-generics", title: "Java Generics", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: false, pages: 34}, "Generic classes, bounds and type safety.", 10),
  sample({id: "java-concurrency", title: "Java Concurrency", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/advanced.svg", access: "Premium", trending: false, pages: 71}, "Thread coordination and concurrency concepts.", 11),
  sample({id: "java-files", title: "Java File Handling", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Java", cover: "/materials/java.svg", access: "Free", trending: false, pages: 35}, "Reading files, streams and path operations.", 12),
  sample({id: "python", title: "Python Foundations", sector: it, category: "Programming Languages", subcategory: "Backend Languages", subject: "Python", cover: "/materials/python.svg", access: "Free", trending: true, pages: 64}, "Python types, collections and functions.", 13),
  sample({id: "dsa", title: "Data Structures & Algorithms", sector: it, category: "Algorithms & DSA", subject: "Coding & DSA", cover: "/materials/dsa.svg", access: "Free", trending: true, pages: 68}, "Problem-solving foundations and algorithmic complexity.", 14),
  sample({id: "graphs", title: "Graphs and Trees", sector: it, category: "Algorithms & DSA", subject: "Coding & DSA", cover: "/materials/dsa.svg", access: "Premium", trending: false, pages: 51}, "Traversals and core graph algorithms.", 15),
  sample({id: "os", title: "Operating Systems", sector: it, category: "Computer Fundamentals", subject: "Operating Systems", cover: "/materials/os.svg", access: "Free", trending: false, pages: 90}, "Processes, threads and memory management.", 16),
  sample({id: "networks", title: "Computer Networks", sector: it, category: "Computer Fundamentals", subject: "Networking", cover: "/materials/network.svg", access: "Free", trending: false, pages: 84}, "TCP/IP, routing and network fundamentals.", 17),
  sample({id: "electronics", title: "Electronic Circuits", sector: eng, category: "Electronics & Communication", subcategory: "Circuit Design", subject: "Electronics", cover: "/materials/electronics.svg", access: "Free", trending: false, pages: 56}, "Circuit analysis, components and measurement basics.", 18),
  sample({id: "digital", title: "Digital Electronics", sector: eng, category: "Electronics & Communication", subcategory: "Circuit Design", subject: "Electronics", cover: "/materials/electronics.svg", access: "Free", trending: true, pages: 73}, "Gates, logic families and digital design basics.", 19),
  sample({id: "vlsi", title: "CMOS VLSI Design", sector: eng, category: "Electronics & Communication", subcategory: "VLSI", subject: "Integrated Circuits", cover: "/materials/vlsi.svg", access: "Premium", trending: true, pages: 82}, "MOS devices, logic and VLSI fundamentals.", 20),
  sample({id: "sensors", title: "Sensors and Transducers", sector: eng, category: "Electronics & Communication", subcategory: "Instrumentation", subject: "Sensors", cover: "/materials/electronics.svg", access: "Free", trending: false, pages: 43}, "Industrial measurement sensors and principles.", 21),
  sample({id: "aptitude", title: "Quantitative Aptitude", sector: pr, category: "Placement Preparation", subcategory: "Aptitude & Reasoning", subject: "Aptitude", cover: "/materials/aptitude.svg", access: "Free", trending: false, pages: 78}, "Numbers, percentages and placement calculations.", 22),
  sample({id: "reason", title: "Logical Reasoning", sector: pr, category: "Placement Preparation", subcategory: "Aptitude & Reasoning", subject: "Reasoning", cover: "/materials/reasoning.svg", access: "Free", trending: true, pages: 61}, "Patterns, arrangements and reasoning sets.", 23),
  sample({id: "verbal", title: "Verbal Ability", sector: pr, category: "Placement Preparation", subject: "English", cover: "/materials/verbal.svg", access: "Free", trending: false, pages: 48}, "Grammar, vocabulary and comprehension.", 24),
  sample({id: "govt", title: "Government Exam Preparation", sector: gov, category: "Competitive Exams", subcategory: "General Preparation", subject: "Competitive Exams", cover: "/materials/govt.svg", access: "Premium", trending: false, pages: 86}, "Exam patterns, reasoning and study planning.", 25),
  sample({id: "bank", title: "Banking Quantitative Aptitude", sector: gov, category: "Competitive Exams", subcategory: "Banking Exams", subject: "Quantitative Aptitude", cover: "/materials/banking.svg", access: "Free", trending: false, pages: 60}, "Banking arithmetic and data interpretation.", 26),
  sample({id: "ssc", title: "SSC General Reasoning", sector: gov, category: "Competitive Exams", subcategory: "SSC Exams", subject: "Reasoning", cover: "/materials/govt.svg", access: "Free", trending: false, pages: 54}, "Reasoning for SSC-style examinations.", 27)
];

export const adminRows = materials.map((m, i) => ({
  id: m.id, title: m.title, subject: m.subject, sector: m.sector, category: m.category,
  type: m.access, status: i % 9 === 1 ? "In review" : i % 9 === 2 ? "Draft" : "Published", date: m.updatedAt
}));
