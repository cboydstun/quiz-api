"use client";

import React, { useCallback, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CombinedGraphQLErrors,
  gql,
  type ErrorLike,
  type TypedDocumentNode,
} from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuth } from "@/contexts/AuthContext";
import Banner, { type BannerKind } from "@/components/Banner";
import { splitAnswers } from "@/lib/questions";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  USER_ADMIN_ROLES,
  type NewUser,
  type Question,
  type Role,
  type User,
} from "@/types";

import Sidebar from "./Sidebar";
import QuestionManagement from "./QuestionManagement";
import UserManagement from "./UserManagement";

// GraphQL queries and mutations
const GET_ALL_USERS: TypedDocumentNode<AllUsersResult> = gql`
  query AllUsers {
    users {
      id
      username
      email
      role
    }
  }
`;

const GET_ALL_QUESTIONS: TypedDocumentNode<AllQuestionsResult> = gql`
  query AllQuestions {
    questions {
      id
      prompt
      questionText
      answers
      correctAnswer
      hint
      points
      createdBy {
        id
        username
      }
    }
  }
`;

const CREATE_QUESTION: TypedDocumentNode<
  CreateQuestionResult,
  CreateQuestionVars
> = gql`
  mutation CreateQuestion($input: CreateQuestionInput!) {
    createQuestion(input: $input) {
      id
      prompt
      questionText
      answers
      correctAnswer
      hint
      points
    }
  }
`;

const UPDATE_QUESTION: TypedDocumentNode<
  UpdateQuestionResult,
  UpdateQuestionVars
> = gql`
  mutation UpdateQuestion($questionId: ID!, $input: UpdateQuestionInput!) {
    updateQuestion(id: $questionId, input: $input) {
      id
      prompt
      questionText
      answers
      correctAnswer
      hint
      points
      createdBy {
        id
        username
      }
    }
  }
`;

const DELETE_QUESTION: TypedDocumentNode<
  DeleteQuestionResult,
  DeleteQuestionVars
> = gql`
  mutation DeleteQuestion($questionId: ID!) {
    deleteQuestion(id: $questionId)
  }
`;

const REGISTER_USER: TypedDocumentNode<RegisterUserResult, RegisterUserVars> =
  gql`
    mutation RegisterUser($input: CreateUserInput!) {
      register(input: $input) {
        user {
          id
          username
          email
          role
        }
        token
      }
    }
  `;

const CHANGE_USER_ROLE: TypedDocumentNode<
  ChangeUserRoleResult,
  ChangeUserRoleVars
> = gql`
  mutation ChangeUserRole($userId: ID!, $newRole: Role!) {
    changeUserRole(userId: $userId, newRole: $newRole) {
      id
      username
      email
      role
    }
  }
`;

const DELETE_USER: TypedDocumentNode<DeleteUserResult, DeleteUserVars> = gql`
  mutation DeleteUser($userId: ID!) {
    deleteUser(userId: $userId)
  }
`;

// Operation result / variable types. Every field is nullable where the backend
// may omit it: errorPolicy is "all", so a partial response yields data === null.
interface AllUsersResult {
  users: User[] | null;
}

interface AllQuestionsResult {
  questions: Question[] | null;
}

interface QuestionInput {
  prompt: string;
  questionText: string;
  answers: string[];
  correctAnswer: string;
  hint: string;
  points: number;
}

interface CreateQuestionResult {
  createQuestion: Question | null;
}
interface CreateQuestionVars {
  input: QuestionInput;
}

interface UpdateQuestionResult {
  updateQuestion: Question | null;
}
interface UpdateQuestionVars {
  questionId: string;
  input: QuestionInput;
}

interface DeleteQuestionResult {
  deleteQuestion: boolean | null;
}
interface DeleteQuestionVars {
  questionId: string;
}

interface RegisterUserResult {
  register: { user: User; token: string } | null;
}
interface RegisterUserVars {
  input: NewUser;
}

interface ChangeUserRoleResult {
  changeUserRole: User | null;
}
interface ChangeUserRoleVars {
  userId: string;
  newRole: Role;
}

interface DeleteUserResult {
  deleteUser: boolean | null;
}
interface DeleteUserVars {
  userId: string;
}

interface PendingConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface MainContentProps {
  activeTab: string;
  user: User;
  usersData?: AllUsersResult;
  usersLoading: boolean;
  usersError?: ErrorLike;
  questionsData?: AllQuestionsResult;
  handleChangeUserRole: (userId: string, newRole: Role) => void;
  handleDeleteUser: (userId: string) => void;
  handleCreateQuestion: (event: React.FormEvent<HTMLFormElement>) => void;
  handleUpdateQuestion: (id: string, updatedQuestion: Question) => void;
  handleDeleteQuestion: (id: string) => void;
  editingQuestion: Question | null;
  setEditingQuestion: (question: Question | null) => void;
  handleRegisterUser: (newUser: NewUser) => void;
}

// Main content area
const MainContent: React.FC<MainContentProps> = ({
  activeTab,
  user,
  usersData,
  usersLoading,
  usersError,
  ...props
}) => {
  switch (activeTab) {
    case "users":
      if (usersLoading)
        return (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        );
      if (usersError)
        return (
          <div className="text-red-500 text-center">
            Error loading users: {usersError.message}
          </div>
        );
      return <UserManagement user={user} usersData={usersData} {...props} />;
    case "questions":
      return <QuestionManagement user={user} {...props} />;
    default:
      return <div className="text-center text-gray-600">Select a tab</div>;
  }
};

const canManageUsers = (role: Role | undefined) =>
  role !== undefined && USER_ADMIN_ROLES.includes(role);

const ManagementPage: React.FC = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("questions");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: BannerKind;
    text: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null,
  );

  const notify = useCallback((kind: BannerKind, text: string) => {
    setFeedback({ kind, text });
  }, []);

  const {
    loading: usersLoading,
    error: usersError,
    data: usersData,
    refetch: refetchUsers,
  } = useQuery(GET_ALL_USERS, {
    skip: !canManageUsers(user?.role),
    fetchPolicy: "network-only",
  });

  const { data: questionsData, refetch: refetchQuestions } = useQuery(
    GET_ALL_QUESTIONS,
    {
      fetchPolicy: "network-only",
    },
  );

  const [createQuestion] = useMutation(CREATE_QUESTION);
  const [updateQuestion] = useMutation(UPDATE_QUESTION);
  const [deleteQuestion] = useMutation(DELETE_QUESTION);
  const [registerUser] = useMutation(REGISTER_USER);
  const [changeUserRole] = useMutation(CHANGE_USER_ROLE);
  const [deleteUser] = useMutation(DELETE_USER);

  const handleCreateQuestion = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const readField = (name: string) =>
      (form.elements.namedItem(name) as HTMLInputElement).value;

    const points = parseInt(readField("points"), 10);
    if (Number.isNaN(points)) {
      notify("error", "Points must be a number");
      return;
    }

    try {
      const { data } = await createQuestion({
        variables: {
          input: {
            prompt: readField("prompt"),
            questionText: readField("questionText"),
            answers: splitAnswers(readField("answers")),
            correctAnswer: readField("correctAnswer"),
            hint: readField("hint"),
            points,
          },
        },
      });
      if (!data?.createQuestion) {
        notify("error", "Error adding question");
        return;
      }
      notify("success", "Question added successfully");
      form.reset();
      refetchQuestions();
    } catch (err) {
      notify("error", "Error adding question");
      console.error(err);
    }
  };

  const handleUpdateQuestion = async (
    questionId: string,
    updatedQuestion: Question,
  ) => {
    try {
      const { data } = await updateQuestion({
        variables: {
          questionId,
          input: {
            prompt: updatedQuestion.prompt,
            questionText: updatedQuestion.questionText,
            answers: updatedQuestion.answers,
            correctAnswer: updatedQuestion.correctAnswer,
            hint: updatedQuestion.hint ?? "",
            points: updatedQuestion.points,
          },
        },
      });
      if (!data?.updateQuestion) {
        notify("error", "Failed to update question");
        return;
      }
      notify("success", "Question updated successfully");
      setEditingQuestion(null);
      refetchQuestions();
    } catch (err) {
      console.error("Error updating question:", err);
      notify("error", "Failed to update question");
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    setConfirmation({
      title: "Delete question",
      message: "Are you sure you want to delete this question?",
      confirmLabel: "Delete question",
      onConfirm: async () => {
        setConfirmation(null);
        try {
          const { data } = await deleteQuestion({ variables: { questionId } });
          if (data?.deleteQuestion) {
            refetchQuestions();
            notify("success", "Question deleted successfully");
          } else {
            notify("error", "Failed to delete question");
          }
        } catch (err) {
          console.error("Error deleting question:", err);
          notify("error", "Error deleting question");
        }
      },
    });
  };

  const handleRegisterUser = async (newUser: NewUser) => {
    try {
      const { data } = await registerUser({
        variables: {
          input: {
            username: newUser.username,
            email: newUser.email,
            password: newUser.password,
            role: newUser.role,
          },
        },
      });
      if (data?.register?.user) {
        notify("success", "User registered successfully");
        refetchUsers();
      } else {
        notify("error", "Failed to register user");
      }
    } catch (err) {
      if (err instanceof Error) {
        notify("error", `Error registering user: ${err.message}`);
        console.error("Detailed error:", err);
      } else {
        notify("error", "An unknown error occurred");
        console.error("Unknown error:", err);
      }
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    if (!user) return;
    if (canManageUsers(user.role)) {
      if (activeTab === "users") {
        refetchUsers();
      }
    } else if (activeTab === "users") {
      setActiveTab("questions");
    }
  }, [authLoading, user, router, activeTab, refetchUsers]);

  const handleChangeUserRole = async (userId: string, newRole: Role) => {
    try {
      const { data } = await changeUserRole({
        variables: { userId, newRole },
      });
      if (!data?.changeUserRole) {
        notify("error", "Error changing user role");
        return;
      }
      await refetchUsers();
      notify("success", "User role updated");
    } catch (err) {
      notify("error", "Error changing user role");
      console.error(err);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setConfirmation({
      title: "Delete user",
      message: "Are you sure you want to delete this user?",
      confirmLabel: "Delete user",
      onConfirm: async () => {
        setConfirmation(null);
        try {
          const { data } = await deleteUser({ variables: { userId } });
          if (data?.deleteUser) {
            await refetchUsers();
            notify("success", "User deleted successfully");
          } else {
            notify("error", "Failed to delete user");
          }
        } catch (err) {
          notify("error", "Error deleting user");
          console.error(err);
        }
      },
    });
  };

  if (authLoading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-linear-to-br from-blue-100 via-white to-purple-100">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      <main className="grow p-8 ml-64">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">
          Management Dashboard
        </h1>
        {feedback && (
          <Banner
            kind={feedback.kind}
            message={feedback.text}
            onDismiss={() => setFeedback(null)}
          />
        )}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <MainContent
            activeTab={activeTab}
            user={user}
            usersData={usersData}
            usersLoading={usersLoading}
            usersError={usersError}
            questionsData={questionsData}
            handleChangeUserRole={handleChangeUserRole}
            handleDeleteUser={handleDeleteUser}
            handleCreateQuestion={handleCreateQuestion}
            handleUpdateQuestion={handleUpdateQuestion}
            handleDeleteQuestion={handleDeleteQuestion}
            editingQuestion={editingQuestion}
            setEditingQuestion={setEditingQuestion}
            handleRegisterUser={handleRegisterUser}
          />
        </div>
      </main>
      {confirmation && (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          onConfirm={confirmation.onConfirm}
          onCancel={() => setConfirmation(null)}
        />
      )}
    </div>
  );
};

export default ManagementPage;
