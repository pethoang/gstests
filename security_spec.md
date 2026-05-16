# Security Spec

## Data Invariants
- A `User` profile must have `displayName`, `email`, `role`, and `createdAt`. Users can create their own profile once.
- An `Exam` must be owned by a teacher (has ownerId).
- A `Submission` must strictly reference an existing `Exam` (examId) and explicitly inherit the `teacherId` to ensure the teacher can list their submissions without relying on global queries.
- `Submission` creation requires the user to be logged in (`auth.uid != null`), and the `studentId` must match the `auth.uid`.
- Updates to `Exam` are strictly limited to the `ownerId` matching the teacher's UID.
- You cannot perform blanket reads on `Exams`, except a single `get` is allowed for students to take the exam. List queries explicitly require `ownerId == auth.uid`.

## The "Dirty Dozen" Payloads
1. **Identity Spoofing (Exam Create)**: Creating an exam with an `ownerId` that doesn't match `request.auth.uid`.
2. **Missing Field (Exam Create)**: Creating an exam without `createdAt`.
3. **Array Type Error (Exam Create)**: Creating an exam where `questions` is a string instead of a list.
4. **Blanket Read (Exam List)**: Listing all exams without an `ownerId` filter.
5. **Modification of another's Exam (Exam Update)**: Updating an exam whose `ownerId` does not match the logged in user.
6. **Orphan Submission (Submission Create)**: Creating a submission with an `examId` that doesn't exist.
7. **Relational Mismatch (Submission Create)**: `teacherId` on the submission does not match the actual `ownerId` of the exam in the db.
8. **Malicious Score (Submission Create)**: Submitting with `score` as a string.
9. **No Name (Submission Create)**: Submitting without a `studentName` (which violates schema length checks).
10. **Blanket Read (Submission List)**: Listing submissions without `teacherId` matching `request.auth.uid`.
11. **Spoofed Student ID (Submission Create)**: Submitting with `studentId` not matching `request.auth.uid`.
12. **Create Profile for Others (User Create)**: Creating a User profile for a `userId` that is not `request.auth.uid`.

## Implementation Rules
- We'll implement strict validation functions: `isValidUser`, `isValidExam` and `isValidSubmission`.
- We'll enforce `email_verified == true` for teacher operations mostly, but we can relax it for creating submissions and profiles if we just rely on `auth.uid` and `auth.token.email`.
- Student creates submission checking `exists(/databases/$(database)/documents/exams/$(incoming().examId))`.
