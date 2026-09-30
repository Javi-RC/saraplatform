import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb } from 'lucide-react';
import { useProjectDetail } from '../hooks/useProjectDetail';
import { useManualRisks } from '../hooks/useManualRisks';
import { useCompletionFeedback } from '../hooks/useCompletionFeedback';
import ProjectDetailHeader from '../components/projects/ProjectDetailHeader';
import FeedbackBanner from '../components/projects/FeedbackBanner';
import EmployeeAssignmentModal from '../components/projects/EmployeeAssignmentModal';
import ManualRiskForm from '../components/risk/ManualRiskForm';
import DraftTeamAnalysis from '../components/projects/DraftTeamAnalysis';
import TeamMembersSection from '../components/projects/TeamMembersSection';
import TabNavigation from '../components/navigation/TabNavigation';
import LoadingState from '../components/common/LoadingState';
import ErrorState from '../components/common/ErrorState';
import ProjectOverviewTab from '../components/projects/tabs/ProjectOverviewTab';
import ProjectDetailsTab from '../components/projects/tabs/ProjectDetailsTab';
import RisksTab from '../components/projects/tabs/RisksTab';
import { PROJECT_STATUS } from '../types/projectTypes';
import { pageStyles as styles } from './projectDetailStyles';

export default function ProjectDetailPage() {
  const { t, i18n } = useTranslation();
  const previousLanguage = useRef(i18n.language);

  const {
    project,
    loading,
    activeTab,
    setActiveTab,
    showAssignModal,
    setShowAssignModal,
    canEdit,
    canDelete,
    handleDelete,
    handleActivate,
    handleComplete,
    handleCancel,
    handleAssignEmployee,
    handleRemoveEmployee,
    reloadProject,
  } = useProjectDetail();

  const {
    manualRisks,
    loading: risksLoading,
    error: risksError,
    loadManualRisks,
    addRisk,
    updateRisk,
    deleteRisk,
    repredictRisks,
    clearError: clearRisksError,
  } = useManualRisks(project?._id);

  const { feedbackStatus, handleOpenRetrospective } = useCompletionFeedback({ project });

  const [showRiskForm, setShowRiskForm] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState(null);
  const [addingRisk, setAddingRisk] = React.useState(false);

  useEffect(() => {
    if (project && project.status !== PROJECT_STATUS.DRAFT) {
      loadManualRisks();
    }
  }, [project, loadManualRisks]);

  useEffect(() => {
    const currentLanguage = i18n.language;
    if (
      previousLanguage.current &&
      previousLanguage.current !== currentLanguage &&
      manualRisks.length > 0
    ) {
      loadManualRisks();
    }
    previousLanguage.current = currentLanguage;
  }, [i18n.language, loadManualRisks, manualRisks.length]);

  const handleAddRisk = async (riskData) => {
    setAddingRisk(true);
    const newRisk = await addRisk(riskData);
    setAddingRisk(false);
    if (newRisk) {
      setShowRiskForm(false);
    }
  };

  const handleEditRisk = async (riskData) => {
    setAddingRisk(true);
    const updated = await updateRisk(editingRisk._id, riskData);
    setAddingRisk(false);
    if (updated) {
      setShowRiskForm(false);
      setEditingRisk(null);
    }
  };

  const handleOpenEditRisk = (risk) => {
    setEditingRisk(risk);
    setShowRiskForm(true);
  };

  const handleCloseRiskForm = () => {
    setShowRiskForm(false);
    setEditingRisk(null);
  };

  const handleDeleteRisk = async (riskId) => {
    await deleteRisk(riskId);
  };

  const handleOpenAddRisk = () => {
    setEditingRisk(null);
    setShowRiskForm(true);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <LoadingState message={t('projects.loadingProject')} />
      </div>
    );
  }

  if (!project) {
    return (
      <div style={styles.container}>
        <ErrorState message={t('projects.detailPage.projectNotFound')} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <ProjectDetailHeader
        project={project}
        canEdit={canEdit}
        canDelete={canDelete}
        onActivate={handleActivate}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onDelete={handleDelete}
      />

      {project.status === PROJECT_STATUS.COMPLETED && (
        <FeedbackBanner
          feedbackStatus={feedbackStatus}
          onOpenRetrospective={handleOpenRetrospective}
        />
      )}

      <TabNavigation
        tabs={[
          { id: 'overview', label: t('projects.detailPage.tabs.overview') },
          ...(project.status === PROJECT_STATUS.DRAFT
            ? [
                {
                  id: 'teamAnalysis',
                  label: t('projects.detailPage.tabs.teamAnalysis'),
                  icon: Lightbulb,
                },
              ]
            : []),
          {
            id: 'team',
            label: t('projects.detailPage.tabs.teamWithCount', {
              count: project.assignedEmployeesCount || 0,
            }),
          },
          { id: 'details', label: t('projects.detailPage.tabs.details') },
          ...(project.status !== PROJECT_STATUS.DRAFT
            ? [{ id: 'risks', label: t('projects.detailPage.tabs.risks') }]
            : []),
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
        ariaLabel={t('projects.detailPage.projectNavigation')}
      />

      <div style={styles.content}>
        {activeTab === 'teamAnalysis' && project.status === PROJECT_STATUS.DRAFT && (
          <DraftTeamAnalysis project={project} onProjectUpdate={reloadProject} />
        )}

        {activeTab === 'overview' && <ProjectOverviewTab project={project} />}

        {activeTab === 'team' && (
          <TeamMembersSection
            project={project}
            canEdit={canEdit}
            onOpenAssignModal={() => setShowAssignModal(true)}
            onRemoveEmployee={handleRemoveEmployee}
          />
        )}

        {activeTab === 'details' && <ProjectDetailsTab project={project} />}

        {activeTab === 'risks' && project.status !== PROJECT_STATUS.DRAFT && (
          <RisksTab
            project={project}
            canEdit={canEdit}
            manualRisks={manualRisks}
            risksLoading={risksLoading}
            risksError={risksError}
            onOpenAddRisk={handleOpenAddRisk}
            onOpenEditRisk={handleOpenEditRisk}
            onDeleteRisk={handleDeleteRisk}
            onRepredictRisks={repredictRisks}
            onClearError={clearRisksError}
            onLoadRisks={loadManualRisks}
          />
        )}
      </div>

      {showAssignModal && (
        <EmployeeAssignmentModal
          organizationId={project.organization?._id || project.organization}
          currentEmployees={project.assignedEmployees || []}
          onAssign={handleAssignEmployee}
          onClose={() => setShowAssignModal(false)}
        />
      )}

      {showRiskForm && (
        <ManualRiskForm
          initialRisk={editingRisk}
          onSubmit={editingRisk ? handleEditRisk : handleAddRisk}
          onCancel={handleCloseRiskForm}
          onDelete={
            editingRisk
              ? async () => {
                  await handleDeleteRisk(editingRisk._id);
                  handleCloseRiskForm();
                }
              : undefined
          }
          loading={addingRisk}
        />
      )}
    </div>
  );
}
