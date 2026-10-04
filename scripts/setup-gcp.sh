#!/usr/bin/env bash
# One-time Google Cloud setup for the PetCare backend. Run in Cloud Shell:
#   bash <(curl -fsSL https://raw.githubusercontent.com/balucharek-web/Petcare/main/scripts/setup-gcp.sh)
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-gen-lang-client-0912555946}"
REGION="${REGION:-europe-west3}"
GITHUB_REPO="${GITHUB_REPO:-balucharek-web/Petcare}"
RUN_SA="petcare-run@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOY_SA="petcare-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"

if [[ "$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingEnabled)' 2>/dev/null)" != "True" ]]; then
  echo "BŁĄD: projekt $PROJECT_ID nie ma podpiętego konta rozliczeniowego (wymagane przez Cloud Run)."
  echo "Podepnij je tutaj i uruchom skrypt ponownie: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
  exit 1
fi

echo "==> Włączanie usług"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  firestore.googleapis.com iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  cloudresourcemanager.googleapis.com

echo "==> Artifact Registry"
gcloud artifacts repositories describe petcare --location="$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create petcare --repository-format=docker --location="$REGION"

echo "==> Firestore"
gcloud firestore databases describe --database='(default)' >/dev/null 2>&1 ||
  gcloud firestore databases create --database='(default)' --location="$REGION" --type=firestore-native

echo "==> Konta usług"
gcloud iam service-accounts describe "$RUN_SA" >/dev/null 2>&1 ||
  gcloud iam service-accounts create petcare-run --display-name="PetCare Cloud Run"
gcloud iam service-accounts describe "$DEPLOY_SA" >/dev/null 2>&1 ||
  gcloud iam service-accounts create petcare-deployer --display-name="PetCare GitHub deployer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$RUN_SA" --role=roles/datastore.user --condition=None >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$DEPLOY_SA" --role=roles/run.admin --condition=None >/dev/null
gcloud artifacts repositories add-iam-policy-binding petcare --location="$REGION" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/artifactregistry.writer >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$RUN_SA" \
  --member="serviceAccount:$DEPLOY_SA" --role=roles/iam.serviceAccountUser >/dev/null

echo "==> Workload Identity Federation dla GitHub Actions ($GITHUB_REPO)"
gcloud iam workload-identity-pools describe github --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe petcare --location=global --workload-identity-pool=github >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc petcare --location=global --workload-identity-pool=github \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository == '${GITHUB_REPO}' && assertion.ref == 'refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding "$DEPLOY_SA" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/attribute.repository/${GITHUB_REPO}" >/dev/null

echo "==> Klucz Gemini API (Secret Manager)"
if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
  echo "Utwórz klucz na https://aistudio.google.com/apikey (projekt $PROJECT_ID) i wklej go poniżej (nie będzie widoczny):"
  read -rs GEMINI_KEY; echo
  [[ -n "$GEMINI_KEY" ]] || { echo "Pusty klucz - przerwano."; exit 1; }
  printf '%s' "$GEMINI_KEY" | gcloud secrets create gemini-api-key --replication-policy=automatic --data-file=-
  unset GEMINI_KEY
fi
gcloud secrets add-iam-policy-binding gemini-api-key --member="serviceAccount:$RUN_SA" \
  --role=roles/secretmanager.secretAccessor >/dev/null

echo
echo "GOTOWE. Workload identity provider:"
echo "  projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github/providers/petcare"
echo "Adres serwera po pierwszym wdrożeniu: https://petcare-${PROJECT_NUMBER}.${REGION}.run.app"
