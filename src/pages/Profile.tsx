import { Layout } from "@/components/Layout";
import ProfileDashboard from "@/components/ProfileDashboard";
import { useParams } from "react-router-dom";

const Profile = () => {
  const { walletAddress } = useParams<{ walletAddress?: string }>();

  return (
    <Layout>
      <ProfileDashboard walletAddress={walletAddress} />
    </Layout>
  );
};

export default Profile;
