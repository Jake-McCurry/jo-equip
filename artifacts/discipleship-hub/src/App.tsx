import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Welcome from "@/pages/Welcome";
import Resources from "@/pages/Resources";
import ResourceDetail from "@/pages/ResourceDetail";
import Channels from "@/pages/Channels";
import ChannelDetail from "@/pages/ChannelDetail";
import SubTopic from "@/pages/SubTopic";
import Playlists from "@/pages/Playlists";
import Books from "@/pages/Books";
import Translate from "@/pages/Translate";
import More from "@/pages/More";
import Brand from "@/pages/Brand";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/welcome" component={Welcome} />
        <Route path="/channels" component={Channels} />
        <Route path="/channels/:channelId" component={ChannelDetail} />
        <Route path="/channels/:channelId/:subId" component={SubTopic} />
        <Route path="/playlists" component={Playlists} />
        <Route path="/books" component={Books} />
        <Route path="/translate" component={Translate} />
        <Route path="/more" component={More} />
        <Route path="/resources" component={Resources} />
        <Route path="/resources/:id" component={ResourceDetail} />
        <Route path="/topics">{() => <Redirect to="/channels" />}</Route>
        <Route path="/topics/:topic">{() => <Redirect to="/channels" />}</Route>
        <Route path="/brand" component={Brand} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
